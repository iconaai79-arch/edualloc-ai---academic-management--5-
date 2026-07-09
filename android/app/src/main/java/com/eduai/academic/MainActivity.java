package com.eduai.academic;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.os.Build;
import android.os.Bundle;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Enable edge-to-edge display
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        
        // Register local print plugin
        registerPlugin(PrintPlugin.class);
        
        createNotificationChannels();
    }

    private void createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            // Channel 1: Academic Updates
            NotificationChannel academicChannel = new NotificationChannel(
                    "academic_updates",
                    getString(R.string.channel_academic_updates_name),
                    NotificationManager.IMPORTANCE_DEFAULT
            );
            academicChannel.setDescription(getString(R.string.channel_academic_updates_description));

            // Channel 2: System Alerts
            NotificationChannel systemChannel = new NotificationChannel(
                    "system_alerts",
                    getString(R.string.channel_system_alerts_name),
                    NotificationManager.IMPORTANCE_HIGH
            );
            systemChannel.setDescription(getString(R.string.channel_system_alerts_description));

            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(academicChannel);
                manager.createNotificationChannel(systemChannel);
            }
        }
    }
}
