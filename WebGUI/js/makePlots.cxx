#include <vector>
{
	vector<TH1F*> histos;

	TFile*   f = new TFile("aSample.root", "recreate");
	TCanvas* c = new TCanvas("C", "c", 1200, 800);
	TRandom* r = new TRandom();

	c->Divide(3, 3);

	double mean  = 10;
	double sigma = 2;

	for(int h = 0; h < 7; h++)
	{
		stringstream ss;
		ss << "Histo" << h;
		histos.push_back(new TH1F(ss.str().c_str(), ss.str().c_str(), 100, 0, 100));
		for(int j = 0; j < r->Rndm() * 1000; j++)
		{
			histos.back()->Fill(r->Gaus(mean, sigma));
		}
		mean += 10;
		sigma += 2;
		c->cd(h + 1);
		histos.back()->Draw();
		histos.back()->Write();
	}

	c->Write();

	f->Close();
}
