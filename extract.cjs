const fs = require('fs');

const content = fs.readFileSync('mmu_simulator_v2.html', 'utf-8');

const styleMatch = content.match(/<style>([\s\S]*?)<\/style>/);
if (styleMatch) {
  // Combine it with default Tailwind setups since we're using CDN, no need for @tailwind rules for now
  fs.writeFileSync('src/index.css', styleMatch[1].trim());
  console.log('CSS extracted');
}

const bodyHTMLMatch = content.match(/<div id="app">([\s\S]*?)<\/div><!-- \/#app -->/);
if (bodyHTMLMatch) {
  fs.writeFileSync('src/legacy_body.html', bodyHTMLMatch[1].trim());
  console.log('HTML structure extracted');
}

const scriptMatch = content.match(/<script>([\s\S]*?)<\/script>/);
if (scriptMatch) {
  fs.writeFileSync('src/legacy_logic.js', scriptMatch[1].trim());
  console.log('JavaScript logic extracted');
}
