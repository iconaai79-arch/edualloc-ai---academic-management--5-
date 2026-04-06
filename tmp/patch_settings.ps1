
$file = "src/components/SettingsManager.tsx"
$content = Get-Content -Path $file -Raw

# 1. Add Notification Username and Password after Short Code in Section 2 (around line 2447)
$shortCodeBlock = '                                            <div>
                                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-2 ml-1">Paybill / Short Code</label>
                                                <input 
                                                    type="text" 
                                                    value={localInstNcbaConfig.shortCode || ''} 
                                                    onChange={(e) => setLocalInstNcbaConfig({ ...localInstNcbaConfig, shortCode: e.target.value })}
                                                    className="form-input font-mono" 
                                                />
                                            </div>'

$notificationFields = '                                            <div className="md:col-span-1">
                                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-2 ml-1">Notification Username</label>
                                                <input 
                                                    type="text" 
                                                    value={localInstNcbaConfig.callbackUsername || """} 
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
                                                            const gen = Array.from(crypto.getRandomValues(new Uint8Array(24))).map(b => b.toString(16).padStart(2, '0')).join('''').substring(0, 32);
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
                                                        value={localInstNcbaConfig.callbackSecret || """} 
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

# We'll replace the LAST occurrence of the shortCodeBlock which is in Section 2.
$lastIndex = $content.LastIndexOf($shortCodeBlock)
if ($lastIndex -ge 0) {
    $before = $content.Substring(0, $lastIndex + $shortCodeBlock.Length)
    $after = $content.Substring($lastIndex + $shortCodeBlock.Length)
    $content = $before + "`n" + $notificationFields + $after
}

# 2. Update clientSecret in Section 2 with Toggle and Auto-Generate
$clientSecretBlockOld = '                                            <div>
                                                <div className="flex justify-between items-center mb-2 px-1">
                                                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest">Consumer Secret / Client Secret</label>
                                                    <button 
                                                        type="button"
                                                        onClick={() => {
                                                            const gen = Array.from(crypto.getRandomValues(new Uint8Array(24))).map(b => b.toString(16).padStart(2, '0')).join('''').substring(0, 32);
                                                            setLocalInstNcbaConfig({ ...localInstNcbaConfig, clientSecret: gen });
                                                        }}
                                                        className="text-[9px] font-black uppercase text-indigo-500 hover:text-indigo-600 flex items-center gap-1"
                                                    >
                                                        <SparklesIcon className="w-2.5 h-2.5" /> Auto-Generate
                                                    </button>
                                                </div>
                                                <input 
                                                    type="password" 
                                                    value={localInstNcbaConfig.clientSecret || """} 
                                                    onChange={(e) => setLocalInstNcbaConfig({ ...localInstNcbaConfig, clientSecret: e.target.value })}
                                                    className="form-input" 
                                                    placeholder="????????????????"
                                                />
                                            </div>'

$clientSecretBlockNew = '                                            <div>
                                                <div className="flex justify-between items-center mb-2 px-1">
                                                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest">Consumer Secret / Client Secret</label>
                                                    <button 
                                                        type="button"
                                                        onClick={() => {
                                                            const gen = Array.from(crypto.getRandomValues(new Uint8Array(24))).map(b => b.toString(16).padStart(2, '0')).join('''').substring(0, 32);
                                                            setLocalInstNcbaConfig({ ...localInstNcbaConfig, clientSecret: gen });
                                                        }}
                                                        className="text-[9px] font-black uppercase text-indigo-500 hover:text-indigo-600 flex items-center gap-1"
                                                    >
                                                        <SparklesIcon className="w-2.5 h-2.5" /> Auto-Generate
                                                    </button>
                                                </div>
                                                <div className="relative">
                                                    <input 
                                                        type={showInstNcbaClientSecret ? "text" : "password"} 
                                                        value={localInstNcbaConfig.clientSecret || """} 
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
                                                </div>
                                            </div>'

# Find the last occurrence of clientSecret block which is in Section 2
$lastIndexCS = $content.LastIndexOf($clientSecretBlockOld.Substring(0, 100)) # Search by prefix as exact match might fail due to ??? characters
if ($lastIndexCS -ge 0) {
    # Find the end of the block
    $endIndexCS = $content.IndexOf("</div>", $lastIndexCS) + 6
    $beforeCS = $content.Substring(0, $lastIndexCS)
    $afterCS = $content.Substring($endIndexCS)
    $content = $beforeCS + $clientSecretBlockNew + $afterCS
}

# 3. Add showInstNcbaClientSecret state definition
$stateAnchor = '    const [showInstNcbaCallbackSecret, setShowInstNcbaCallbackSecret] = useState(false);'
$newState = '    const [showInstNcbaClientSecret, setShowInstNcbaClientSecret] = useState(false);'
if ($content.Contains($stateAnchor) -and -not $content.Contains($newState)) {
    $content = $content.Replace($stateAnchor, $stateAnchor + "`n" + $newState)
}

Set-Content -Path $file -Value $content -NoNewline
