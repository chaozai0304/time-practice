package com.sprout.timepractice;

/** Timer policy deliberately has no dependency on the main Activity visibility. */
final class GuardRuntime {
    private GuardRuntime() {}
    static boolean shouldLock(boolean active, boolean locked, long deadline, long now) {
        return active && !locked && deadline > 0 && now >= deadline;
    }
    static boolean shouldShowOverlay(boolean active, boolean locked, boolean interactive, boolean keyguardLocked, boolean parentVisible) {
        return active && locked && interactive && !keyguardLocked && !parentVisible;
    }
}