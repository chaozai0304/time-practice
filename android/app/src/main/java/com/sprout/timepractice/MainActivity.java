package com.sprout.timepractice;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
	private static volatile boolean foreground;
	static boolean isForeground() { return foreground; }
	@Override
	public void onCreate(Bundle savedInstanceState) {
		registerPlugin(LearningGuardPlugin.class);
		super.onCreate(savedInstanceState);
	}
    @Override public void onResume() { super.onResume(); foreground = true; GuardDiagnostics.record(this, "main_foreground", "主界面返回前台"); GuardService.requestCheck(); }
    @Override public void onPause() { foreground = false; GuardDiagnostics.record(this, "main_background", "主界面离开前台，原生计时继续"); super.onPause(); }
}
