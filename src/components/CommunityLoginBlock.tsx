                                             {regData.institutionType === 'Community' && (
                                                <div className="mt-3 animate-fade-in">
                                                    <label className={labelClasses}>Community Focus Area</label>
                                                    <select
                                                        className={inputClasses}
                                                        value={regData.category || ''}
                                                        onChange={e => setRegData({ ...regData, category: e.target.value, businessSubType: e.target.value })}
                                                        required
                                                    >
                                                        <option value="">-- Select Focus --</option>
                                                        <option value="Chama/Savings Group">Self Help / Savings Group (Chama)</option>
                                                        <option value="Estate/Neighborhood">Estate / Neighborhood Management</option>
                                                        <option value="NGO/Foundation">NGO / Social Foundation</option>
                                                        <option value="Resource Center">Community Hub / Resource Center</option>
                                                        <option value="Relief/Social Work">Social Work / Welfare Relief</option>
                                                        <option value="Family Heritage">Family & Heritage Preservation</option>
                                                    </select>
                                                </div>
                                             )}
