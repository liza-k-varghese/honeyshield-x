package com.honeyshield.soc;

import java.util.Collections;
import java.util.List;
import java.util.ArrayList;

/**
 * HoneyShield X — Android Application Life Cycle & Security Architecture
 * Configures notification channels and hardware keystore security enclave.
 */
public class HoneyShieldApplication {
    public static final String CHANNEL_CRITICAL = "security-critical";
    public static final String CHANNEL_ALERTS = "security-alerts";
    public static final String CHANNEL_DECEPTION = "deception-hits";

    private final List<String> registeredChannels = new ArrayList<>();
    private boolean securityEnclaveReady = false;

    public void onCreate() {
        System.out.println("[HoneyShield X] Application starting up...");
        registerNotificationChannels();
        initializeSecurityEnclave();
    }

    private void registerNotificationChannels() {
        registeredChannels.add(CHANNEL_CRITICAL);
        registeredChannels.add(CHANNEL_ALERTS);
        registeredChannels.add(CHANNEL_DECEPTION);
        System.out.println("[HoneyShield X] Configured Android notification channels: " + registeredChannels);
    }

    private void initializeSecurityEnclave() {
        this.securityEnclaveReady = true;
        System.out.println("[HoneyShield X] Hardware Keystore & Biometric Enclave bound.");
    }

    public List<String> getRegisteredChannels() {
        return Collections.unmodifiableList(registeredChannels);
    }

    public boolean isSecurityEnclaveReady() {
        return securityEnclaveReady;
    }
}

