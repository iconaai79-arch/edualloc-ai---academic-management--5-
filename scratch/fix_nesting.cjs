
const fs = require('fs');
const path = 'c:\\Users\\hp\\Downloads\\edualloc-ai---academic-management (5)\\src\\components\\AlumnaePortalView.tsx';
const content = fs.readFileSync(path, 'utf8');
const lines = content.split('\n');

const start = 513; // line 514
const end = 521;   // line 522

const newLines = [
    '                                              </div>',
    '                                          </div>',
    '                                      )}',
    '                                  </div>',
    '                              ))}',
    '                          </div>',
    '                      </div>',
    '                  </div>',
    '              </div>'
];

// Let's verify the lines we are replacing
console.log('Replacing lines:');
for(let i=start; i<end; i++) console.log(i+1 + ': ' + lines[i]);

lines.splice(start, end-start, ...newLines);

fs.writeFileSync(path, lines.join('\n'));
console.log('Fixed nesting at 514-522');
