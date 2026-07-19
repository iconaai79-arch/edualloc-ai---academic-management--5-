package com.eduai.academic;

import android.Manifest;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothSocket;
import android.content.Context;
import android.os.Build;
import android.print.PrintManager;
import android.util.Base64;
import android.util.Log;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import com.getcapacitor.PermissionState;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.util.Set;
import java.util.UUID;

@CapacitorPlugin(
    name = "EduaiPrint",
    permissions = {
        @Permission(
            alias = "bluetooth",
            strings = {
                Manifest.permission.BLUETOOTH_CONNECT
            }
        )
    }
)
public class PrintPlugin extends Plugin {
    private static final String TAG = "PrintPlugin";

    @PluginMethod
    public void printPdf(PluginCall call) {
        String base64Data = call.getString("base64");
        String docName = call.getString("name", "Print Job");

        if (base64Data == null || base64Data.isEmpty()) {
            call.reject("Base64 data is required");
            return;
        }

        // Clean base64 header if present
        if (base64Data.contains(",")) {
            base64Data = base64Data.substring(base64Data.indexOf(",") + 1);
        }

        try {
            byte[] pdfBytes = Base64.decode(base64Data, Base64.DEFAULT);
            File cacheDir = getActivity().getCacheDir();
            File tempFile = new File(cacheDir, "print_job_" + System.currentTimeMillis() + ".pdf");
            
            try (FileOutputStream fos = new FileOutputStream(tempFile)) {
                fos.write(pdfBytes);
                fos.flush();
            }

            getActivity().runOnUiThread(() -> {
                try {
                    PrintManager printManager = (PrintManager) getActivity().getSystemService(Context.PRINT_SERVICE);
                    if (printManager != null) {
                        PdfPrintAdapter adapter = new PdfPrintAdapter(tempFile, docName);
                        printManager.print(docName, adapter, null);
                        call.resolve();
                    } else {
                        call.reject("PrintManager not available");
                    }
                } catch (Exception e) {
                    call.reject("Failed to trigger system print: " + e.getMessage());
                }
            });

        } catch (Exception e) {
            call.reject("Failed to process PDF data: " + e.getMessage());
        }
    }

    @PluginMethod
    public void getBluetoothPrinters(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (getPermissionState("bluetooth") != PermissionState.GRANTED) {
                requestPermissionForAlias("bluetooth", call, "bluetoothPermissionCallback");
                return;
            }
        }
        retrievePairedDevices(call);
    }

    @PermissionCallback
    public void bluetoothPermissionCallback(PluginCall call) {
        if (getPermissionState("bluetooth") == PermissionState.GRANTED) {
            retrievePairedDevices(call);
        } else {
            call.reject("Bluetooth connection permission is required to search for printers.");
        }
    }

    private void retrievePairedDevices(PluginCall call) {
        try {
            BluetoothAdapter bluetoothAdapter = BluetoothAdapter.getDefaultAdapter();
            if (bluetoothAdapter == null) {
                call.reject("Bluetooth is not supported on this device.");
                return;
            }

            if (!bluetoothAdapter.isEnabled()) {
                call.reject("Bluetooth is disabled. Please enable it in system settings.");
                return;
            }

            Set<BluetoothDevice> pairedDevices = bluetoothAdapter.getBondedDevices();
            JSArray devices = new JSArray();

            for (BluetoothDevice device : pairedDevices) {
                JSObject dev = new JSObject();
                dev.put("name", device.getName() != null ? device.getName() : "Unknown Printer");
                dev.put("address", device.getAddress());
                devices.put(dev);
            }

            JSObject ret = new JSObject();
            ret.put("devices", devices);
            call.resolve(ret);

        } catch (SecurityException se) {
            call.reject("Permission check failed: " + se.getMessage());
        } catch (Exception e) {
            call.reject("Failed to retrieve Bluetooth devices: " + e.getMessage());
        }
    }

    @PluginMethod
    public void printRawBluetooth(PluginCall call) {
        String address = call.getString("address");
        String base64Bytes = call.getString("base64Bytes");

        if (address == null || address.isEmpty()) {
            call.reject("Printer MAC address is required");
            return;
        }

        if (base64Bytes == null || base64Bytes.isEmpty()) {
            call.reject("Print bytes in base64 format are required");
            return;
        }

        byte[] bytes;
        try {
            bytes = Base64.decode(base64Bytes, Base64.DEFAULT);
        } catch (Exception e) {
            call.reject("Invalid base64 encoding: " + e.getMessage());
            return;
        }

        new Thread(() -> {
            BluetoothSocket socket = null;
            try {
                BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
                if (adapter == null) {
                    call.reject("Bluetooth is not supported on this device.");
                    return;
                }

                BluetoothDevice device = adapter.getRemoteDevice(address);
                UUID uuid = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB"); // SPP UUID
                
                socket = device.createRfcommSocketToServiceRecord(uuid);
                socket.connect();
                
                OutputStream os = socket.getOutputStream();
                os.write(bytes);
                os.flush();
                
                // Shut down output to signal EOF (End of File) to printer
                try {
                    socket.getOutputStream().close();
                } catch (IOException ignored) {}
                
                // Sleep longer to give printer enough time to roll out paper before closing socket
                Thread.sleep(2500);
                
                socket.close();
                call.resolve();
            } catch (SecurityException se) {
                call.reject("Bluetooth permissions missing: " + se.getMessage());
            } catch (Exception e) {
                Log.e(TAG, "Bluetooth printing failed", e);
                call.reject("Bluetooth printing failed: " + e.getMessage());
                if (socket != null) {
                    try {
                        socket.close();
                    } catch (IOException ignored) {}
                }
            }
        }).start();
    }

    @PluginMethod
    public void printRawNetwork(PluginCall call) {
        String ipAddress = call.getString("ipAddress");
        Integer portInt = call.getInt("port", 9100);
        int port = (portInt != null) ? portInt : 9100;
        String base64Bytes = call.getString("base64Bytes");

        if (ipAddress == null || ipAddress.isEmpty()) {
            call.reject("IP address is required");
            return;
        }

        if (base64Bytes == null || base64Bytes.isEmpty()) {
            call.reject("Print bytes in base64 format are required");
            return;
        }

        byte[] bytes;
        try {
            bytes = Base64.decode(base64Bytes, Base64.DEFAULT);
        } catch (Exception e) {
            call.reject("Invalid base64 encoding: " + e.getMessage());
            return;
        }

        new Thread(() -> {
            Socket socket = null;
            try {
                socket = new Socket();
                socket.connect(new InetSocketAddress(ipAddress, port), 4000); // 4 second timeout
                
                OutputStream os = socket.getOutputStream();
                os.write(bytes);
                os.flush();
                
                // Signal End of Stream (TCP FIN) to the network printer
                try {
                    socket.shutdownOutput();
                } catch (IOException ignored) {}
                
                // Allow network printer buffer to print before closing socket
                Thread.sleep(1500);
                
                socket.close();
                call.resolve();
            } catch (Exception e) {
                Log.e(TAG, "Network printing failed", e);
                call.reject("Network printing failed: " + e.getMessage());
                if (socket != null && !socket.isClosed()) {
                    try {
                        socket.close();
                    } catch (IOException ignored) {}
                }
            }
        }).start();
    }
}
