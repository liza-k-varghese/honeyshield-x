package com.honeyshield.soc;

import java.util.Map;
import java.util.HashMap;

/**
 * HoneyShield X — Android SOC Command Center Main Entrypoint
 * Handles deep-link routing (honeyshield://pairing, honeyshield://alert/{id})
 * and initializes React Native runtime with Digital Agent synchronization.
 */
public class MainActivity {
    public static final String APPLICATION_ID = "com.honeyshield.soc";
    public static final String VERSION_NAME = "1.0.0-rc5";
    public static final int VERSION_CODE = 5;
    public static final String SCHEME_PAIRING = "honeyshield://pairing";
    public static final String SCHEME_ALERT_PREFIX = "honeyshield://alert/";

    private boolean isInitialized = false;
    private String activeRoute = "/soc/dashboard";
    private final Map<String, Object> launchContext = new HashMap<>();

    public void onCreate() {
        System.out.println("[HoneyShield X] MainActivity.onCreate() initialized - " + VERSION_NAME);
        this.isInitialized = true;
        this.launchContext.put("appId", APPLICATION_ID);
        this.launchContext.put("version", VERSION_NAME);
        this.launchContext.put("versionCode", VERSION_CODE);
        this.launchContext.put("initializedAt", System.currentTimeMillis());
    }

    public boolean handleDeepLink(String uri) {
        if (uri == null) return false;
        if (uri.startsWith(SCHEME_PAIRING)) {
            this.activeRoute = "/pairing/scan";
            System.out.println("[HoneyShield X] Dispatched deep link to QR Device Pairing route.");
            return true;
        } else if (uri.startsWith(SCHEME_ALERT_PREFIX)) {
            String alertId = uri.substring(SCHEME_ALERT_PREFIX.length());
            this.activeRoute = "/soc/alerts/" + alertId;
            System.out.println("[HoneyShield X] Dispatched deep link to Incident Alert ID: " + alertId);
            return true;
        }
        return false;
    }

    public String getActiveRoute() {
        return this.activeRoute;
    }

    public boolean isReady() {
        return this.isInitialized;
    }

    public static void main(String[] args) {
        MainActivity activity = new MainActivity();
        activity.onCreate();
        if (args.length > 0) {
            activity.handleDeepLink(args[0]);
        }
    }
}

