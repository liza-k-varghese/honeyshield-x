package com.honeyshield.soc;

import java.util.concurrent.atomic.AtomicLong;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * HoneyShield X — Digital Agent Sync Service
 * Manages cross-platform state for SCOUT, NEXUS, ORACLE, and SENTINEL.
 * Tracks monotonic PostgreSQL outbox event cursors and real-time courier traces.
 */
public class DigitalAgentSyncService {
    public enum AgentRole {
        SCOUT,
        NEXUS,
        ORACLE,
        SENTINEL
    }

    private final AtomicLong outboxCursor = new AtomicLong(0L);
    private final Map<AgentRole, String> agentStates = new ConcurrentHashMap<>();

    public DigitalAgentSyncService() {
        agentStates.put(AgentRole.SCOUT, "MONITORING_INGEST");
        agentStates.put(AgentRole.NEXUS, "STREAMING_COURIER");
        agentStates.put(AgentRole.ORACLE, "ENRICHING_INTEL");
        agentStates.put(AgentRole.SENTINEL, "GUARDING_GRID");
    }

    public long advanceCursor(long newSequence) {
        while (true) {
            long current = outboxCursor.get();
            if (newSequence <= current) {
                return current;
            }
            if (outboxCursor.compareAndSet(current, newSequence)) {
                return newSequence;
            }
        }
    }

    public long getCursor() {
        return outboxCursor.get();
    }

    public String getAgentStatus(AgentRole role) {
        String status = agentStates.get(role);
        return status != null ? status : "OFFLINE";
    }

    public void updateAgentStatus(AgentRole role, String status) {
        agentStates.put(role, status);
    }
}
