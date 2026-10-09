"""SSRF Security & Anti-DNS Rebinding Gateway (Module 3.9).

Enforces:
- Scheme enforcement: strictly HTTPS in production.
- Test loopback exception only behind explicit environment variable.
- Rejection of credentials/userinfo in URLs.
- Rejection of malformed ports and control characters.
- Pre-resolution and validation of all DNS addresses.
- Comprehensive blacklisting of private, loopback, link-local, multicast,
  broadcast, carrier-grade NAT, documentation, and cloud metadata networks.
- Safe unpacking and evaluation of IPv4-mapped IPv6 addresses.
- Direct IP connection binding to neutralize DNS-rebinding attacks.
- Preservation of SNI server_hostname and TLS certificate validation.
- Complete disabling of HTTP redirects (fail-safe zero-redirect policy).
- Strict timeouts (3s connect, 5s read) and bounded response buffers (16KB).
"""

from dataclasses import dataclass
import http.client
import ipaddress
import logging
import os
import re
import socket
import ssl
from typing import Any
import urllib.parse

logger = logging.getLogger(__name__)

# Bounded response buffer (16 KB)
MAX_RESPONSE_BODY_BYTES: int = 16 * 1024

# Default timeouts
DEFAULT_CONNECT_TIMEOUT: float = 3.0
DEFAULT_READ_TIMEOUT: float = 5.0

# Disallowed IPv4 networks
DISALLOWED_IPV4_NETWORKS: list[ipaddress.IPv4Network] = [
    ipaddress.ip_network("0.0.0.0/8"),          # Current network (RFC 1122)
    ipaddress.ip_network("10.0.0.0/8"),         # Private-Use (RFC 1918)
    ipaddress.ip_network("100.64.0.0/10"),      # Shared Address / CGNAT (RFC 6598)
    ipaddress.ip_network("127.0.0.0/8"),        # Loopback (RFC 1122)
    ipaddress.ip_network("169.254.0.0/16"),     # Link-Local / Cloud Metadata (RFC 3927)
    ipaddress.ip_network("172.16.0.0/12"),      # Private-Use (RFC 1918)
    ipaddress.ip_network("192.0.0.0/24"),       # IETF Protocol Assignments (RFC 6890)
    ipaddress.ip_network("192.0.2.0/24"),       # TEST-NET-1 (RFC 5737)
    ipaddress.ip_network("192.168.0.0/16"),     # Private-Use (RFC 1918)
    ipaddress.ip_network("198.18.0.0/15"),      # Network Interconnect Benchmarking (RFC 2544)
    ipaddress.ip_network("198.51.100.0/24"),    # TEST-NET-2 (RFC 5737)
    ipaddress.ip_network("203.0.113.0/24"),     # TEST-NET-3 (RFC 5737)
    ipaddress.ip_network("224.0.0.0/4"),        # Multicast (RFC 5771)
    ipaddress.ip_network("240.0.0.0/4"),        # Reserved for Future Use (RFC 1112)
    ipaddress.ip_network("255.255.255.255/32"), # Limited Broadcast (RFC 919)
]

# Disallowed IPv6 networks
DISALLOWED_IPV6_NETWORKS: list[ipaddress.IPv6Network] = [
    ipaddress.ip_network("::/128"),             # Unspecified address
    ipaddress.ip_network("::1/128"),            # Loopback address
    ipaddress.ip_network("100::/64"),           # Discard prefix (RFC 6666)
    ipaddress.ip_network("2001:db8::/32"),      # Documentation prefix (RFC 3849)
    ipaddress.ip_network("fc00::/7"),           # Unique Local Address (ULA) (RFC 4193)
    ipaddress.ip_network("fe80::/10"),          # Link-Local Unicast (RFC 4291)
    ipaddress.ip_network("ff00::/8"),           # Multicast (RFC 4291)
]

# Cloud metadata specific IP strings and hostnames
CLOUD_METADATA_HOSTS: set[str] = {
    "169.254.169.254",
    "fd00:ec2::254",
    "metadata.google.internal",
    "metadata.packet.net",
    "instance-data",
}


class SSRFValidationError(Exception):
    """Raised when an outbound URL fails SSRF safety gates."""
    pass


@dataclass
class ValidatedDestination:
    """Validated destination with pre-resolved IP addresses."""
    original_url: str
    scheme: str
    hostname: str
    port: int
    path_and_query: str
    resolved_ips: list[str]


def is_test_loopback_allowed() -> bool:
    """Check if the test harness environment variable explicitly allows loopback destinations."""
    val = os.getenv("HONEYSHIELD_ALLOW_TEST_WEBHOOK_LOOPBACK", "").strip().lower()
    return val in ("true", "1", "yes")


def is_ip_disallowed(ip: ipaddress.IPv4Address | ipaddress.IPv6Address, allow_loopback: bool = False) -> tuple[bool, str]:
    """Check whether an IP address belongs to any disallowed or restricted network range."""
    # Check specific cloud metadata strings
    ip_str = str(ip)
    if ip_str in CLOUD_METADATA_HOSTS:
        return True, f"Explicit cloud metadata address blocked: {ip_str}"

    # Handle IPv4-mapped IPv6 (::ffff:x.x.x.x)
    if isinstance(ip, ipaddress.IPv6Address):
        if ip.ipv4_mapped is not None:
            # Recursively check the underlying IPv4 address
            return is_ip_disallowed(ip.ipv4_mapped, allow_loopback=allow_loopback)

        # Check loopback exception for IPv6
        if allow_loopback and ip == ipaddress.IPv6Address("::1"):
            return False, ""

        for net in DISALLOWED_IPV6_NETWORKS:
            if ip in net:
                return True, f"IPv6 address {ip_str} belongs to disallowed network {net}"

        if ip.is_private or ip.is_link_local or ip.is_multicast or ip.is_loopback:
            return True, f"IPv6 address {ip_str} is private/reserved"

    elif isinstance(ip, ipaddress.IPv4Address):
        # Check loopback exception for IPv4
        if allow_loopback and ip.is_loopback:
            return False, ""

        for net in DISALLOWED_IPV4_NETWORKS:
            if ip in net:
                return True, f"IPv4 address {ip_str} belongs to disallowed network {net}"

        if ip.is_private or ip.is_link_local or ip.is_multicast or ip.is_loopback:
            return True, f"IPv4 address {ip_str} is private/reserved"

    return False, ""


def validate_destination_url(url: str, allow_test_loopback: bool | None = None) -> ValidatedDestination:
    """Perform deterministic SSRF and anti-rebinding pre-flight validation on target URL.

    Raises:
        SSRFValidationError: On any policy violation or resolution error.
    """
    if not url or not isinstance(url, str):
        raise SSRFValidationError("Webhook URL must be a non-empty string.")

    # 1. Control character inspection
    if any(ord(c) < 32 or ord(c) == 127 for c in url):
        raise SSRFValidationError("URL contains forbidden control characters.")

    allow_loopback = allow_test_loopback if allow_test_loopback is not None else is_test_loopback_allowed()

    # 2. Parse URL structure
    try:
        parsed = urllib.parse.urlsplit(url)
    except Exception as e:
        raise SSRFValidationError(f"Malformed URL structure: {e}")

    # 3. Scheme Gate
    scheme = (parsed.scheme or "").lower()
    if allow_loopback:
        if scheme not in ("https", "http"):
            raise SSRFValidationError(f"Scheme '{scheme}' is forbidden. Permitted schemes: https, http (test mode).")
    else:
        if scheme != "https":
            raise SSRFValidationError(f"Scheme '{scheme}' is forbidden. Webhooks strictly require HTTPS in production.")

    # 4. Userinfo Gate (Prevent credential smuggling)
    if parsed.username or parsed.password or "@" in (parsed.netloc or ""):
        raise SSRFValidationError("URLs with embedded userinfo (credentials) are strictly forbidden.")

    # 5. Hostname Gate
    hostname = (parsed.hostname or "").strip().lower()
    if not hostname:
        raise SSRFValidationError("URL contains an empty or missing hostname.")

    if hostname in CLOUD_METADATA_HOSTS:
        raise SSRFValidationError(f"Hostname '{hostname}' matches prohibited cloud metadata endpoint.")

    if hostname.endswith(".internal") or hostname.endswith(".local"):
        if not allow_loopback:
            raise SSRFValidationError(f"Internal domain suffix in '{hostname}' is forbidden.")

    # 6. Port Gate
    try:
        port = parsed.port
    except ValueError as e:
        raise SSRFValidationError(f"Invalid port in URL: {e}")

    if port is None:
        port = 443 if scheme == "https" else 80
    elif port < 1 or port > 65535:
        raise SSRFValidationError(f"Port {port} is outside valid TCP port range [1, 65535].")

    # 7. DNS Pre-Resolution & Anti-Rebinding Check
    # Attempt to resolve hostname to all associated IP addresses
    resolved_ips: list[str] = []
    try:
        # Check if hostname is already a raw IP literal
        parsed_ip = ipaddress.ip_address(hostname)
        disallowed, reason = is_ip_disallowed(parsed_ip, allow_loopback=allow_loopback)
        if disallowed:
            raise SSRFValidationError(reason)
        resolved_ips.append(str(parsed_ip))
    except ValueError:
        # Hostname is a domain name: query socket.getaddrinfo
        try:
            addr_info = socket.getaddrinfo(
                hostname,
                port,
                family=socket.AF_UNSPEC,
                type=socket.SOCK_STREAM,
                proto=socket.IPPROTO_TCP,
            )
        except socket.gaierror as e:
            raise SSRFValidationError(f"DNS resolution failed for hostname '{hostname}': {e}")
        except Exception as e:
            raise SSRFValidationError(f"Unexpected DNS resolution error for '{hostname}': {e}")

        if not addr_info:
            raise SSRFValidationError(f"DNS resolution returned zero records for hostname '{hostname}'.")

        # Validate EVERY resolved IP address. If ANY IP is disallowed, reject the destination.
        seen_ips: set[str] = set()
        for family, _, _, _, sockaddr in addr_info:
            ip_str = sockaddr[0]
            if ip_str in seen_ips:
                continue
            seen_ips.add(ip_str)

            try:
                ip_obj = ipaddress.ip_address(ip_str)
            except ValueError:
                raise SSRFValidationError(f"Resolved address '{ip_str}' is not a valid IP.")

            disallowed, reason = is_ip_disallowed(ip_obj, allow_loopback=allow_loopback)
            if disallowed:
                raise SSRFValidationError(f"DNS resolution for '{hostname}' returned prohibited address {ip_str}: {reason}")

            resolved_ips.append(ip_str)

    if not resolved_ips:
        raise SSRFValidationError(f"No valid IP addresses resolved for hostname '{hostname}'.")

    # Build path and query string
    path = parsed.path or "/"
    if parsed.query:
        path = f"{path}?{parsed.query}"

    return ValidatedDestination(
        original_url=url,
        scheme=scheme,
        hostname=hostname,
        port=port,
        path_and_query=path,
        resolved_ips=resolved_ips,
    )


class DirectIPHTTPSConnection(http.client.HTTPSConnection):
    """HTTPS connection binding directly to a pre-validated IP while preserving SNI."""

    def __init__(
        self,
        target_ip: str,
        port: int,
        sni_hostname: str,
        timeout: float = DEFAULT_CONNECT_TIMEOUT,
        context: ssl.SSLContext | None = None,
    ) -> None:
        super().__init__(target_ip, port, timeout=timeout, context=context)
        self.sni_hostname = sni_hostname
        self.target_ip = target_ip

    def connect(self) -> None:
        # Connect socket directly to target_ip
        sock = socket.create_connection((self.host, self.port), self.timeout)
        if self._tunnel_host:
            self.sock = sock
            self._tunnel()

        ctx = self.context or ssl.create_default_context()
        # Enforce server hostname verification against the original domain, not the raw IP
        self.sock = ctx.wrap_socket(sock, server_hostname=self.sni_hostname)


class DirectIPHTTPConnection(http.client.HTTPConnection):
    """Plain HTTP connection binding directly to a pre-validated IP."""

    def __init__(
        self,
        target_ip: str,
        port: int,
        host_header: str,
        timeout: float = DEFAULT_CONNECT_TIMEOUT,
    ) -> None:
        super().__init__(target_ip, port, timeout=timeout)
        self.host_header = host_header


def send_verified_http_request(
    url: str,
    method: str = "POST",
    headers: dict[str, str] | None = None,
    body: bytes | None = None,
    connect_timeout: float = DEFAULT_CONNECT_TIMEOUT,
    read_timeout: float = DEFAULT_READ_TIMEOUT,
    max_response_bytes: int = MAX_RESPONSE_BODY_BYTES,
    allow_test_loopback: bool | None = None,
) -> tuple[int, dict[str, str], bytes]:
    """Execute outbound HTTP request directly bound to pre-validated IP without redirects.

    Returns:
        tuple of (status_code, response_headers_dict, response_body_bytes)

    Raises:
        SSRFValidationError: If destination violates SSRF security boundaries.
        TimeoutError: If connect or read timeout expires.
        Exception: On network or transport failures.
    """
    dest = validate_destination_url(url, allow_test_loopback=allow_test_loopback)
    target_ip = dest.resolved_ips[0]

    req_headers = dict(headers or {})
    # Ensure Host header accurately reflects target domain
    if dest.port in (80, 443):
        req_headers.setdefault("Host", dest.hostname)
    else:
        req_headers.setdefault("Host", f"{dest.hostname}:{dest.port}")

    conn: http.client.HTTPConnection | None = None
    try:
        if dest.scheme == "https":
            ssl_context = ssl.create_default_context()
            # For loopback test mode with self-signed test certs, allow disabling verify if flagged
            if is_test_loopback_allowed() and dest.hostname in ("127.0.0.1", "localhost"):
                ssl_context.check_hostname = False
                ssl_context.verify_mode = ssl.CERT_NONE

            conn = DirectIPHTTPSConnection(
                target_ip=target_ip,
                port=dest.port,
                sni_hostname=dest.hostname,
                timeout=connect_timeout,
                context=ssl_context,
            )
        else:
            conn = DirectIPHTTPConnection(
                target_ip=target_ip,
                port=dest.port,
                host_header=dest.hostname,
                timeout=connect_timeout,
            )

        # Connect directly
        conn.connect()
        # Set socket timeout for subsequent read operations
        if conn.sock:
            conn.sock.settimeout(read_timeout)

        # Send request
        conn.request(method, dest.path_and_query, body=body, headers=req_headers)

        # Retrieve response without automatic redirect following
        resp = conn.getresponse()
        resp_status = resp.status
        resp_headers = {k.lower(): v for k, v in resp.getheaders()}
        resp_body = resp.read(max_response_bytes)

        return resp_status, resp_headers, resp_body

    except (socket.timeout, TimeoutError) as e:
        raise TimeoutError(f"HTTP request timed out connecting to {dest.hostname}: {e}")
    except ssl.SSLError as e:
        raise ssl.SSLError(f"TLS handshake/certificate verification failed for {dest.hostname}: {e}")
    except Exception as e:
        raise e
    finally:
        if conn:
            try:
                conn.close()
            except Exception:
                pass
