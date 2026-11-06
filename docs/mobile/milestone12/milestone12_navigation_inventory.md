# Milestone 12 — Mobile Navigation & Screen Inventory

**Document:** `milestone12_navigation_inventory.md`  
**Target Release Candidate:** `v1.0.0-rc5`  

---

## 1. Navigation Architecture

HoneyShield X Mobile implements a hierarchical navigation structure powered by React Navigation:
- **RootNavigator**: Handles authentication state switching between `AuthStack` and `AppTabs`.
- **AuthStack**:
  - `Login`: Standard operator credentials entry.
  - `Pairing`: QR pairing initiation and scan coordinator.
  - `PairingQrScanner`: Camera viewfinder for scanning desktop QR pairing code.
- **AppTabs** (Bottom HUD Navigation Bar):
  - `SOC`: Security Operations Center Command Center (`SocDashboardScreen`, `AlertsListScreen`, `AttackExplorerScreen`).
  - `Deception`: Active Deception Grid & Attack Lab (`DeceptionDashboardScreen`).
  - `Intel`: Threat Intelligence & Adversary Tracking (`ThreatIntelScreen`).
  - `Cases`: SOAR Incident Cases & Playbooks (`CasesListScreen`).
  - `Devices`: Authorized Operator Devices & Revocation (`DeviceManagementScreen`).

## 2. Deep-Link Routing Table

| Scheme / Path | Target Screen | Context Payload |
|---|---|---|
| `honeyshield://pairing` | `PairingScreen` / `PairingQrScanner` | Initiates camera viewfinder for pairing handshake |
| `honeyshield://alert/{id}` | `AlertDetailsModal` / `SocDashboard` | Navigates directly to alert ID with telemetry focus |
| `honeyshield://case/{id}` | `CasesListScreen` | Focuses target SOAR incident playbook |

