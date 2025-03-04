#ifndef _ots_VisualDataManagerV2_h_
#define _ots_VisualDataManagerV2_h_

#include "otsdaq/DataManager/DataManager.h"
// #include "otsdaq/MonicelliInterface/Visual3DEvent.h"
// #include "otsdaq/MonicelliInterface/Visual3DGeometry.h"
// #include "otsdaq/MonicelliInterface/MonicelliEventAnalyzer.h"
// #include "otsdaq/MonicelliInterface/MonicelliGeometryConverter.h"
#include "otsdaq/RootUtilities/DQMHistosBase.h"

#include <map>
#include <string>
#include <vector>

namespace ots
{
class ConfigurationManager;
class RawDataVisualizerConsumer;

class VisualDataManagerV2 : public DataManager
{
  public:
	VisualDataManagerV2(const ConfigurationTree& theXDAQContextConfigTree,
	                    const std::string&       supervisorConfigurationPath);
	virtual ~VisualDataManagerV2(void);

	void configure(void) override;
	void halt(void) override;
	void pause(void) override;
	void resume(void) override;
	void start(std::string runNumber) override;
	void stop(void) override;

	void load(std::string fileName, std::string type);
	/// Getters
	DQMHistosBase* getLiveDQMHistos(void);
	DQMHistosBase& getFileDQMHistos(void);
	// const Visual3DEvents&   getVisual3DEvents   (void);
	// const Visual3DGeometry& getVisual3DGeometry (void);

	const std::string& getRawData(void);

  private:
	DQMHistosBase* theLiveDQMHistos_;
	DQMHistosBase  theFileDQMHistos_;
	// MonicelliEventAnalyzer     theMonicelliEventAnalyzer_;
	// MonicelliGeometryConverter theMonicelliGeometryConverter_;
	// Visual3DData           the3DData_;

	RawDataVisualizerConsumer* theRawDataConsumer_;
};
}  // namespace ots

#endif
