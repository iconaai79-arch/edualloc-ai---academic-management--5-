const fs = require('fs');

try {
    let c = fs.readFileSync('src/components/AlumnaePortalView.tsx', 'utf8');

    const lines = c.split(/\r?\n/);
    const startIdx = lines.findIndex(l => l.includes('                                  </div>') && lines[lines.indexOf(l)+1].includes('                              </div>') && lines[lines.indexOf(l)+2].includes('                          </div>'));
    
    if (startIdx !== -1) {
        console.log("Found at line " + startIdx);
        // We know the structure is:
        // startIdx + 0: </div>
        // startIdx + 1: </div>
        // startIdx + 2: </div>
        // startIdx + 3: </div> (extra)
        // startIdx + 4: ))}
        // startIdx + 5: </div>
        // startIdx + 6: </div>
        // startIdx + 7: </div>
        // startIdx + 8: </div>
        // startIdx + 9: ) : activeSection === 'classmates' ? (
        
        // We want to replace lines startIdx to startIdx + 9 with:
        // startIdx + 0: </div>
        // startIdx + 1: </div>
        // startIdx + 2: </div>
        // startIdx + 3: ))}
        // startIdx + 4: </div>
        // startIdx + 5: </>
        // startIdx + 6: ) : activeSection === 'classmates' ? (
        
        lines.splice(startIdx, 10,
            "                                  </div>",
            "                              </div>",
            "                          </div>",
            "                      ))}",
            "                  </div>",
            "              </>",
            "                ) : activeSection === 'classmates' ? ("
        );
        
        fs.writeFileSync('src/components/AlumnaePortalView.tsx', lines.join('\n'));
        console.log("File patched successfully!");
    } else {
        console.log("Pattern not found.");
    }
} catch (e) {
    console.error(e);
}
