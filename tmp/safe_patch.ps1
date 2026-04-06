
$path = "c:\Users\hp\Downloads\edualloc-ai---academic-management (5)\src\components\SettingsManager.tsx"
$content = [System.IO.File]::ReadAllText($path)

# Add showInstNcbaClientSecret state
$oldState = 'const [showInstNcbaCallbackSecret, setShowInstNcbaCallbackSecret] = useState(false);'
$newState = $oldState + "`r`n    const [showInstNcbaClientSecret, setShowInstNcbaClientSecret] = useState(false);"
if ($content.Contains($oldState) -and -not $content.Contains("showInstNcbaClientSecret")) {
    $content = $content.Replace($oldState, $newState)
}

# Update Section 2 Client Secret Block
# We'll replace the block including the masked placeholder to be sure it's Section 2
$oldCSBlock = '                                            <input 
                                                    type="password" 
                                                    value={localInstNcbaConfig.clientSecret || '''''''
                                                    onChange={(e) => setLocalInstNcbaConfig({ ...localInstNcbaConfig, clientSecret: e.target.value })}
                                                    className="form-input" 
                                                    placeholder="????????????????"
                                                />'

# Since we don't know the exact masked chars in memory (they might be different), let's use a smaller anchor
$anchorCS = "onChange={(e) => setLocalInstNcbaConfig({ ...localInstNcbaConfig, clientSecret: e.target.value })}"
# We'll replace the one that follows the Consumer Secret label and doesn't have the toggle yet.

$newCSBlockFragment = '                                                <div className="relative">
                                                    <input 
                                                        type={showInstNcbaClientSecret ? "text" : "password"} 
                                                        value={localInstNcbaConfig.clientSecret || ""} 
                                                        onChange={(e) => setLocalInstNcbaConfig({ ...localInstNcbaConfig, clientSecret: e.target.value })}
                                                        className="form-input" 
                                                        placeholder="Enter Client Secret"
                                                    />
                                                    <button 
                                                        type="button"
                                                        onClick={() => setShowInstNcbaClientSecret(!showInstNcbaClientSecret)}
                                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-500 transition-colors"
                                                    >
                                                        {showInstNcbaClientSecret ? <EyeIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4 opacity-50" />}
                                                    </button>
                                                </div>'

# For safety, I'll use a very specific replace logic in the script
# But the charset issue is really killing me. 

# Let's try to just add the missing fields first after Short Code.
$shortCodeBlock = '                                            <div>
                                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-2 ml-1">Paybill / Short Code</label>
                                                <input 
                                                    type="text" 
                                                    value={localInstNcbaConfig.shortCode || ''' + "''" + '} 
                                                    onChange={(e) => setLocalInstNcbaConfig({ ...localInstNcbaConfig, shortCode: e.target.value })}
                                                    className="form-input font-mono" 
                                                />
                                            </div>'

$notificationFields = '                                            <div className="md:col-span-1">
                                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-2 ml-1">Notification Username</label>
                                                <input 
                                                    type="text" 
                                                    value={localInstNcbaConfig.callbackUsername || ""} 
                                                    onChange={(e) => setLocalInstNcbaConfig({ ...localInstNcbaConfig, callbackUsername: e.target.value })}
                                                    className="form-input" 
                                                    placeholder="Enter Notification Username"
                                                />
                                            </div>
                                            <div className="md:col-span-1">
                                                <div className="flex justify-between items-center mb-2 px-1">
                                                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest">Notification Password / Secret Key</label>
                                                    <button 
                                                        type="button"
                                                        onClick={() => {
                                                            const gen = Array.from(crypto.getRandomValues(new Uint8Array(24))).map(b => b.toString(16).padStart(2, ''0'')).join('''').substring(0, 32);
                                                            setLocalInstNcbaConfig({ ...localInstNcbaConfig, callbackSecret: gen });
                                                        }}
                                                        className="text-[9px] font-black uppercase text-indigo-500 hover:text-indigo-600 flex items-center gap-1"
                                                    >
                                                        <SparklesIcon className="w-2.5 h-2.5" /> Auto-Generate
                                                    </button>
                                                </div>
                                                <div className="relative">
                                                    <input 
                                                        type={showInstNcbaCallbackSecret ? "text" : "password"} 
                                                        value={localInstNcbaConfig.callbackSecret || ""} 
                                                        onChange={(e) => setLocalInstNcbaConfig({ ...localInstNcbaConfig, callbackSecret: e.target.value })}
                                                        className="form-input" 
                                                        placeholder="Enter Notification Secret"
                                                    />
                                                    <button 
                                                        type="button"
                                                        onClick={() => setShowInstNcbaCallbackSecret(!showInstNcbaCallbackSecret)}
                                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-500 transition-colors"
                                                    >
                                                        {showInstNcbaCallbackSecret ? <EyeIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4 opacity-50" />}
                                                    </button>
                                                </div>
                                            </div>'

# Replace the LAST occurrence
$lastIdx = $content.LastIndexOf($shortCodeBlock)
if ($lastIdx -ge 0) {
    $content = $content.Insert($lastIdx + $shortCodeBlock.Length, "`r`n" + $notificationFields)
}

[System.IO.File]::WriteAllText($path, $content)
