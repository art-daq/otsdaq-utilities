import { TMultiGraphPainter as TMultiGraphPainter2D } from '../hist2d/TMultiGraphPainter.js';
import { TH1Painter } from '../hist2d/TH1Painter.js';
import { TH2Painter } from './TH2Painter.js';
import { TGraphPainter } from './TGraphPainter.js';


class TMultiGraphPainter extends TMultiGraphPainter2D {

   /** @summary draw special histogram for axis
     * @return {Promise} when ready */
   async drawAxisHist(histo, hopt) {
      const dom = this.getDrawDom();
      return this._3d
              ? TH2Painter.draw(dom, histo, 'LEGO' + hopt)
              : TH1Painter.draw(dom, histo, hopt);
   }

   /** @summary draw multi graph in 3D */
   async drawGraph(dom, gr, opt, pos3d) {
      if (this._3d) opt += `pos3d_${pos3d}`;
      return TGraphPainter.draw(dom, gr, opt);
   }

   /** @summary Draw TMultiGraph object */
   static async draw(dom, mgraph, opt) {
      const painter = new TMultiGraphPainter(dom, mgraph, opt);
      return painter.redrawWith(opt, true);
   }

} // class TMultiGraphPainter

export { TMultiGraphPainter };
