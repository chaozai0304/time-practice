package com.sprout.timepractice;
import static org.junit.Assert.*;
import org.junit.Test;

public class GuardRuntimeTest {
    @Test public void timerUsesPersistentDeadline() { assertFalse(GuardRuntime.shouldLock(true, false, 60000, 59999)); assertTrue(GuardRuntime.shouldLock(true, false, 60000, 60000)); assertFalse(GuardRuntime.shouldLock(false, false, 60000, 99999)); assertFalse(GuardRuntime.shouldLock(true, true, 60000, 99999)); }
    @Test public void parentDoesNotChangeLockOnlyOverlayVisibility() { assertTrue(GuardRuntime.shouldShowOverlay(true, true, true, false, false)); assertFalse(GuardRuntime.shouldShowOverlay(true, true, true, false, true)); assertTrue(GuardRuntime.shouldLock(true, false, 60000, 99999)); }
    @Test public void systemLockAndScreenOffAreRespected() { assertFalse(GuardRuntime.shouldShowOverlay(true, true, false, false, false)); assertFalse(GuardRuntime.shouldShowOverlay(true, true, true, true, false)); assertFalse(GuardRuntime.shouldShowOverlay(false, true, true, false, false)); }
}