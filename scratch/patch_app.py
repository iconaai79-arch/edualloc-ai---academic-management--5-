import os

file_path = r"c:\Users\hp\Downloads\edualloc-ai---academic-management (5)\src\components\App.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

target = "                                         return { success: res.success, message: res.message, checkoutRequestId: res.checkoutRequestId || res.checkoutRequestID || res.checkout_request_id || res.id };\n"
replacement = """                                         if (res.success) {
                                             // Save pending record immediately for audit/tracking
                                             await apiService.saveModuleRecord('mpesa_transactions', {
                                                 id: `txn_${Date.now()}`,
                                                 institutionId: 'GLOBAL',
                                                 amount: amount,
                                                 phoneNumber: phone,
                                                 payerName: 'Alumna Registration (Pending)',
                                                 timestamp: new Date().toISOString(),
                                                 status: 'pending',
                                                 provider: 'ncba',
                                                 paymentMethod: 'stk_push',
                                                 checkoutRequestId: res.checkoutRequestId || res.checkoutRequestID || res.checkout_request_id || res.id,
                                                 description: 'Alumnae Network Activation'
                                             });
                                         }
                                         return { success: res.success, message: res.message, checkoutRequestId: res.checkoutRequestId || res.checkoutRequestID || res.checkout_request_id || res.id };
"""

# Find the occurrence around line 5000
new_lines = []
found = False
for line in lines:
    if target in line and not found:
        new_lines.append(replacement)
        found = True
    else:
        new_lines.append(line)

if found:
    with open(file_path, "w", encoding="utf-8") as f:
        f.writelines(new_lines)
    print("Replacement successful")
else:
    print("Target not found")
