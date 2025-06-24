# svg2pdf

## Original code

https://github.com/yWorks/svg2pdf.js

## Modification in original version

https://github.com/linev/svg2pdf.js/commits/jsroot/

1. Do not use 'specifity' and 'cssesc' - not required for JSROOT
2. Keep only 'jspdf' as external - rest is included in build

## How to build

    npm install
    npm run build
    sed '$ d' ./dist/svg2pdf.es.js | sed "s/from 'jspdf'/from '.\/jspdf.js'/g" > ~/git/jsroot/modules/base/svg2pdf.js
    sed '$ d' ./dist/svg2pdf.es.min.js | sed 's/from"jspdf"/from".\/jspdf.js"/g' > ~/git/jsroot/libs/svg2pdf.js

Command sed '$ d' removew reference on map and modifies import

