/* Tracker pulser scan: scope and timing come only from applied configuration. */
(function(root) {
    'use strict';
    const SUBSYSTEM='Trk_HardwareGateway';
    const GLOBALS='SubsystemTrackerGlobalParametersTable';
    const MACRO='ROC FEMacro - Prepare external pulser run (tracker configuration)';
    function check(ok,message){if(!ok)throw Error(message);}
    function values(xml,name){return Array.from(xml.getElementsByTagName(name)).map(n=>decodeURIComponent(n.getAttribute('value')||''));}
    function tracker(xml){
        const names=values(xml,'subsystem_name');
        check(names.filter(n=>n===SUBSYSTEM).length===1,'Tracker subsystem is missing or ambiguous.');
        const i=names.indexOf(SUBSYSTEM);
        const field=name=>{const a=values(xml,'subsystem_'+name);check(a.length===names.length,'Missing tracker '+name);return a[i];};
        const result={subsystem:SUBSYSTEM,status:field('status'),fsm:field('fsmName'),
            configuration:{name:field('activeConfigGroupName'),key:field('activeConfigGroupKey')},
            context:{name:field('activeContextGroupName'),key:field('activeContextGroupKey')}};
        check(result.status==='Configured','Tracker must be Configured and stopped; current state: '+result.status);
        check(result.fsm.trim()!=='','Tracker has no configured FSM.');
        for(const g of [result.configuration,result.context])check(g.name&&/^\d+$/.test(g.key)&&Number.isSafeInteger(Number(g.key)),'Missing configured tracker group/context.');
        return result;
    }
    function counts(table){
        const out={};
        for(const [name,max] of [['ExternalPulserDelayCounts',2147483647],['ExternalPulserWidthCounts',65535],['ExternalPulserRunSeconds',2147483647]]){
            const rows=table.rows.filter(r=>r.ParameterName===name);
            check(rows.length===1&&rows[0].Status==='On','Configure tracker with an enabled '+GLOBALS+'/'+name+' row before playing this scan.');
            const value=rows[0].ParameterValue;
            check(/^\d+$/.test(value)&&Number.isSafeInteger(Number(value))&&Number(value)>0&&Number(value)<=max,'Invalid '+GLOBALS+'/'+name);
            out[name]=Number(value);
        }
        check(out.ExternalPulserWidthCounts<=out.ExternalPulserDelayCounts,'Pulser width exceeds period count.');
        return {delay:out.ExternalPulserDelayCounts,width:out.ExternalPulserWidthCounts,durationSeconds:out.ExternalPulserRunSeconds};
    }
    function scope(structure){
        const targets=[],excluded=[],seen=new Set();
        for(const app of structure.apps||[])for(const dtc of app.dtcs||[]){
            if(!/^Trk(0[1-9]|1[0-8])_DTC[01]$/.test(dtc.name))continue;
            check(!seen.has(dtc.name),'Duplicate tracker DTC: '+dtc.name);seen.add(dtc.name);
            if(app.enabled!=='1'||dtc.enabled!=='1'){excluded.push({uid:dtc.name,reason:'disabled context/application/interface'});continue;}
            const rocs=(dtc.rocs||[]).filter(r=>r.enabled==='1');
            if(!rocs.length){excluded.push({uid:dtc.name,reason:'no enabled ROCs'});continue;}
            check(rocs.every(r=>Number.isInteger(r.link)&&r.link>=0&&r.link<=5)&&new Set(rocs.map(r=>r.link)).size===rocs.length,'Invalid/duplicate ROC links for '+dtc.name);
            targets.push({uid:dtc.name,rocs:rocs.map(r=>({uid:r.name,link:r.link})).sort((a,b)=>a.link-b.link)});
        }
        check(targets.length>0,'No tracker DTCs with enabled ROCs in the configured context.');
        targets.sort((a,b)=>a.uid.localeCompare(b.uid));
        return {targets,excluded};
    }
    async function resolve(deps){
        const first=tracker(await deps.status());
        const [configuration,context]=await Promise.all([deps.group(first.configuration),deps.group(first.context)]);
        const tables={};
        await Promise.all(['XDAQContextTable','XDAQApplicationTable','FESupervisorTable','FEInterfaceTable','DTCInterfaceTable','ROCInterfaceTable',GLOBALS].map(async name=>{
            const group=['XDAQContextTable','XDAQApplicationTable'].includes(name)?context:configuration;
            check(/^\d+$/.test(group.members[name]),'Configured tracker group lacks '+name);
            tables[name]=await deps.table(name,group.members[name]);
        }));
        const selection=scope(deps.structure(tables));
        let timing;
        try {timing=counts(tables[GLOBALS]);}
        catch(error){
            error.message='Configured tracker: '+first.configuration.name+'('+first.configuration.key+')'+
                '\nContext: '+first.context.name+'('+first.context.key+')'+
                '\nFSM: '+first.fsm+'\nDTCs: '+selection.targets.length+'; enabled ROCs: '+selection.targets.reduce((n,t)=>n+t.rocs.length,0)+
                '\nGlobal parameter table: v'+tables[GLOBALS].version+'\n\n'+error.message;
            throw error;
        }
        if(deps.feInfo){
            const info=await deps.feInfo();
            for(const t of selection.targets){
                const fe=Array.from(info.getElementsByTagName('fe')).find(e=>e.getAttribute('value')===t.uid);
                check(fe&&Array.from(fe.getElementsByTagName('macro')).some(m=>m.getAttribute('value')===MACRO),
                    t.uid+': configured pulser macro unavailable. Reload and Configure the tracker frontends before playing the scan.');
            }
        }
        const second=tracker(await deps.status());
        check(JSON.stringify(first)===JSON.stringify(second),'Tracker configured state changed during discovery; refresh the scan.');
        return Object.assign(first,selection,timing,{globalVersion:tables[GLOBALS].version});
    }
    function build(resolved){
        check(resolved&&resolved.subsystem===SUBSYSTEM&&resolved.status==='Configured'&&resolved.fsm&&resolved.targets.length,'Resolve the configured tracker before playing a scan.');
        check(Number.isSafeInteger(resolved.durationSeconds)&&resolved.durationSeconds>0,'Missing configured scan duration.');
        const args=[['Target ROC or Mask (Default = -1 := all configured ROCs, or 0x111111 := all)',-1,0,''],['Modulo8 channel',0,1,'PULSER_CHANNEL']]
            .map(row=>row.map(v=>encodeURIComponent(String(v))).join(':')).join(',');
        const cmd=(type,param,targetSubsystem)=>({type,param,targetSubsystem:targetSubsystem||''});
        return {commands:[cmd('CHOOSE_FSM',{NameOfStateMachine:resolved.fsm}),cmd('BEGIN_LABEL',{Label:'PULSER_CHANNEL'}),
            cmd('EXECUTE_FE_MACRO',{'CSV-Targets':resolved.targets.map(t=>'FEInterfaceTable/'+t.uid).join(','),MacroName:MACRO,MacroArgs:args,
                EnableSavingOutputsToFile:0,OutputFilePath:'',OutputFileRadix:''},SUBSYSTEM),
            cmd('RUN',{WaitForAllFrontEndsRunningThread:0,DurationInSeconds:resolved.durationSeconds}),
            cmd('REPEAT_LABEL',{Label:'PULSER_CHANNEL',NumberOfRepetitions:7})],settingsSource:GLOBALS,resolved};
    }
    function guardPlan(commands,resolved){
        const expected=build(resolved).commands;
        check(commands.length===expected.length,'Invalid generated pulser execution snapshot.');
        commands.forEach((c,i)=>{
            const e=expected[i];check(c.type===e.type,'Invalid generated pulser execution snapshot.');
            if(i===0)check(c.param.NameOfStateMachine===resolved.fsm,'Configured tracker FSM changed; retry Play.');
            if(i===1||i===4)check(c.param.Label==='PULSER_CHANNEL','Invalid pulser channel loop.');
            if(i===2){
                check(c.targetSubsystem===SUBSYSTEM&&c.param.MacroName===MACRO,'Pulser scan must use configured tracker settings.');
                check(String(c.param['CSV-Targets']).split(',').sort().join(',')===e.param['CSV-Targets'],'Tracker DTC scope changed; retry Play.');
                const args=String(c.param.MacroArgs).split(',').map(a=>a.split(':').map(decodeURIComponent));
                check(args.length===2,'Explicit pulser argument overrides are not allowed. Retry Play.');
                const target=args.find(a=>a[0]===decodeURIComponent(e.param.MacroArgs.split(',')[0].split(':')[0]));
                const channel=args.find(a=>a[0]==='Modulo8 channel');
                check(target&&Number(target[1])===-1&&Number(target[2])===0&&!(target[3]||''),'Scan must target all enabled ROCs.');
                check(channel&&Number(channel[1])===0&&Number(channel[2])===1&&channel[3]==='PULSER_CHANNEL','Invalid modulo-8 channel scan.');
            }
            if(i===3)check(Number(c.param.DurationInSeconds)===resolved.durationSeconds,'Configured run duration changed; retry Play.');
            if(i===4)check(Number(c.param.NumberOfRepetitions)===7,'Pulser scan must have eight passes.');
        });
        return true;
    }
    function isScan(name,commands){
        return name==='TrackerExternalPulserScan'||(commands||[]).some(c=>c.type==='EXECUTE_FE_MACRO'&&c.param.MacroName===MACRO);
    }
    function serialize(commands){
        return commands.map(c=>{
            const parts=['type',encodeURIComponent(c.type)];
            if(c.targetSubsystem)parts.push('TargetSubsystem',encodeURIComponent(c.targetSubsystem));
            for(const [key,value] of Object.entries(c.param)){
                if(key==='CSV-Targets'){
                    const targets=String(value).split(',').map(t=>t.split('/'));
                    parts.push('CSVTargetTables',targets.map(t=>encodeURIComponent(t[0])).join('='),
                        'CSVTargetUIDs',targets.map(t=>encodeURIComponent(t[1])).join('='));
                }else parts.push(key,encodeURIComponent(value));
            }
            return parts.join(',')+';';
        }).join('');
    }
    const EXECUTION_TABLES=['IterateTable','IterationPlanTable','IterationCommandChooseFSMTable',
        'IterationCommandBeginLabelTable','IterationCommandExecuteFEMacroTable','IterationTargetTable',
        'IterationCommandMacroDimensionalLoopTable','IterationCommandMacroDimensionalLoopParameterTable',
        'IterationCommandRunTable','IterationCommandRepeatLabelTable'];
    function blank(value){return value===undefined||value===''||value==='DEFAULT'||value==='Default'?'':String(value);}
    function boolean(value){
        const s=String(value).toLowerCase();
        if(['1','on','yes','true'].includes(s))return true;
        if(['0','off','no','false','default','', 'undefined'].includes(s))return false;
        throw Error('Unknown stored boolean: '+value);
    }
    function matchesStored(tables,execution,onMismatch){
        // Compare executable content only: row UIDs, authors, comments and timestamps
        // do not change the scan. Unknown/malformed content is never considered equal.
        try {
            const rows=name=>{check(tables[name]&&Array.isArray(tables[name].rows),'Missing '+name);return tables[name].rows;};
            const one=(name,field,value)=>{const r=rows(name).filter(r=>r[field]===value);check(r.length===1,'Missing/duplicate linked row');return r[0];};
            const root=one('IterateTable','IterationPlanName','TrackerExternalPulserScan');
            check(boolean(root.Status)&&root.LinkToIterationPlanTable==='IterationPlanTable','Disabled/disconnected stored plan');
            const commands=rows('IterationPlanTable').filter(r=>r.IterationPlanGroupID===root.LinkToIterationPlanGroupID&&boolean(r.Status));
            check(commands.length===execution.commands.length,'Different command count');
            for(let i=0;i<commands.length;i++){
                const c=commands[i],e=execution.commands[i];
                check(c.CommandType===e.type&&blank(c.TargetSubsystem)===(e.targetSubsystem||''),'Different command/subsystem');
                const name={CHOOSE_FSM:'IterationCommandChooseFSMTable',BEGIN_LABEL:'IterationCommandBeginLabelTable',
                    EXECUTE_FE_MACRO:'IterationCommandExecuteFEMacroTable',RUN:'IterationCommandRunTable',REPEAT_LABEL:'IterationCommandRepeatLabelTable'}[e.type];
                check(c.LinkToCommandTable===name,'Different command link');
                const p=one(name,'CommandID',c.LinkToCommandUID);
                if(e.type==='CHOOSE_FSM')check(p.NameOfStateMachine===e.param.NameOfStateMachine,'Different FSM');
                if(e.type==='BEGIN_LABEL'||e.type==='REPEAT_LABEL')check(p.Label===e.param.Label,'Different loop label');
                if(e.type==='REPEAT_LABEL')check(Number(p.NumberOfRepetitions)===Number(e.param.NumberOfRepetitions),'Different repetitions');
                if(e.type==='RUN')check(Number(p.DurationInSeconds)===Number(e.param.DurationInSeconds)&&
                    boolean(p.WaitForAllFrontEndsRunningThread)===false&&boolean(p.WriteToECL)===false,'Different run settings');
                if(e.type==='EXECUTE_FE_MACRO'){
                    check(p.MacroName===e.param.MacroName&&!boolean(p.EnableSavingOutputsToFile)&&
                        blank(p.OutputFilePath)===''&&blank(p.OutputFileRadix)==='','Different macro/output settings');
                    check(p.LinkToTargets==='IterationTargetTable','Different targets link');
                    const targets=rows('IterationTargetTable').filter(t=>t.IterationTargetGroupID===p.LinkToTargetsGroupID)
                        .map(t=>t.LinkToTarget+'/'+t.LinkToTargetUID).sort();
                    check(JSON.stringify(targets)===JSON.stringify(e.param['CSV-Targets'].split(',').sort()),'Different targets');
                    check(p.LinkToMacroDimensionalLoopTable==='IterationCommandMacroDimensionalLoopTable','Different argument loops link');
                    const loops=rows('IterationCommandMacroDimensionalLoopTable').filter(l=>l.DimensionalLoopGroupID===p.LinkToMacroDimensionalLoopGroupID);
                    const args=[];
                    for(const loop of loops){
                        check(Number(loop.NumberOfIterations)===1&&loop.LinkToDimensionalLoopParameterTable==='IterationCommandMacroDimensionalLoopParameterTable','Different argument loop');
                        const parameters=rows('IterationCommandMacroDimensionalLoopParameterTable').filter(p=>p.ParameterGroupID===loop.LinkToDimensionalLoopParameterGroupID);
                        check(parameters.length>0,'Empty argument dimension');
                        for(const a of parameters)args.push([a.ParameterName,Number(a.ParameterInitialValue),Number(a.ParameterStepSize),Number(a.ParameterStepSize)!==0?(blank(loop.StepLabel)||'PULSER_CHANNEL'):'']);
                    }
                    const expected=e.param.MacroArgs.split(',').map(a=>a.split(':').map(decodeURIComponent)).map(a=>[a[0],Number(a[1]),Number(a[2]),a[3]||'']);
                    const sort=a=>a.sort((x,y)=>JSON.stringify(x).localeCompare(JSON.stringify(y)));
                    check(JSON.stringify(sort(args))===JSON.stringify(sort(expected)),'Different arguments');
                }
            }
            return true;
        } catch(error){if(onMismatch)onMismatch(error.message);return false;}
    }
    async function inspectExecution(deps,execution){
        const stored=await deps.loadExecution();
        let reason='';
        const reused=matchesStored(stored.tables,execution,message=>{reason=message;});
        return {reused,group:stored.group,reason};
    }
    async function persistExecution(deps,execution){
        const name='TrackerExternalPulserScan';
        guardPlan(execution.commands,execution.resolved);
        const result=await inspectExecution(deps,execution);
        if(result.reused)return result;
        await deps.store(name,execution.commands);
        return {reused:false};
    }
    async function browserDependencies(){
        check(typeof TrackerRateMask!=='undefined','Tracker table reader did not load; reload Iterator.');
        let lid;
        function request(type,query,gateway){return new Promise((resolve,reject)=>{
            const url='Request?RequestType='+encodeURIComponent(type)+Object.entries(query||{}).map(([k,v])=>'&'+encodeURIComponent(k)+'='+encodeURIComponent(v)).join('');
            DesktopContent.XMLHttpRequest(url,'',(req,unused,error)=>{
                if(error||!req||!req.responseXML)return reject(Error(error||'Non-XML response from '+type));
                const errors=values(req.responseXML,'Error').concat(type==='getSpecificTableGroup'?[]:values(req.responseXML,'TreeErrors')).filter(Boolean);
                if(errors.length)return reject(Error(errors.join('; ')));
                resolve(req.responseXML);
            },0,0,true,true,true,false,false,gateway?undefined:lid);
        });}
        const app=await request('getAppId',{classNeedle:'ots::ConfigurationGUISupervisor'},true);
        lid=Number(values(app,'id')[0]);check(Number.isInteger(lid)&&lid>0,'Configuration GUI unavailable.');
        function gatewayRequest(url,data,configuration,statusOnly){return new Promise((resolve,reject)=>{
            DesktopContent.XMLHttpRequest(url,data||'',(req,unused,error)=>{
                if(error||!req||!req.responseXML)return reject(Error(error||'No response preparing pulser execution.'));
                const e=(statusOnly?['Error']:['Error','error_message']).flatMap(n=>values(req.responseXML,n)).filter(Boolean);
                if(e.length)return reject(Error(e.join('; ')));
                resolve(req);
            },0,0,true,true,true,false,false,configuration?lid:undefined);
        });}
        function bounded(work){return new Promise((resolve,reject)=>{
            const timer=setTimeout(()=>reject(Error('Timed out preparing the pulser execution; no Play request was sent.')),30000);
            work.then(value=>{clearTimeout(timer);resolve(value);},error=>{clearTimeout(timer);reject(error);});
        });}
        async function iterationGroup(){
            const history=await request('getLastTableGroups',{},false);
            const names=values(history,'LastActivatedIteratorGroupName'),keys=values(history,'LastActivatedIteratorGroupKey');
            check(names.length===1&&names[0]&&keys.length===1&&/^\d+$/.test(keys[0]),'Cannot identify the last activated Iterator group.');
            const group={name:names[0],key:keys[0]};
            const editor=await bounded(new Promise(resolve=>ConfigurationAPI.getActiveGroups(resolve)));
            check(editor&&editor.Iterate&&editor.Iterate.groupName===group.name&&String(editor.Iterate.groupKey)===group.key,
                'Iterator editor and activated group differ; reload Iterator before Play.');
            return group;
        }
        async function loadExecution(){
            const group=await iterationGroup();
            const metadata=TrackerRateMask.group(await request('getSpecificTableGroup',{groupName:group.name,groupKey:group.key}),group.name,group.key);
            const tables={};
            await Promise.all(EXECUTION_TABLES.map(async name=>{
                const version=metadata.members[name];
                if(version===undefined)return;
                check(/^\d+$/.test(version),'Iterator comparison requires saved table versions.');
                tables[name]=TrackerRateMask.table(await request('getSpecificTable',{tableName:name,version,dataOffset:0,chunkSize:0,rawData:0,allowIllegalColumns:1}),name,version);
            }));
            check(JSON.stringify(await iterationGroup())===JSON.stringify(group),'Iterator group changed during comparison; retry Play.');
            return {group,tables};
        }
        function executionTables(tables){return tables.filter(t=>/^(IterateTable|Iteration(Plan|Target|Command[A-Za-z]*)Table)$/.test(t.tableName));}
        async function store(name,commands){
            check(!document.getElementById(ConfigurationAPI._POP_UP_DIALOG_ID),'Close the configuration editor dialog before Play.');
            let modified=await bounded(new Promise((resolve,reject)=>ConfigurationAPI.addSubsetRecords('IterateTable',name,(tables,error)=>{
                if(error&&!error.includes('Entries in UID are not unique.'))return reject(Error(error));
                if(!tables.length&&!error)return reject(Error('Unable to prepare Iterator execution record.'));
                resolve(executionTables(tables));
            },undefined,true)));
            modified=await bounded(new Promise((resolve,reject)=>ConfigurationAPI.setFieldValuesForRecords('IterateTable',[name],
                ['Status','LinkToIterationPlanTable','LinkToIterationPlanGroupID','CommentDescription'],
                ['1','IterationPlanTable',name+'-Plan','Automatic tracker pulser execution; resolved at Play'],
                (tables,error)=>error||!tables.length?reject(Error(error||'Unable to link pulser execution.')):resolve(executionTables(tables)),modified,true)));
            const req=await gatewayRequest('Request?RequestType=savePlanCommandSequence&planName='+encodeURIComponent(name),
                'commands='+serialize(commands)+'&modifiedTables='+modified.map(t=>t.tableName+','+t.tableVersion).join(','),true);
            const names=values(req.responseXML,'NewActiveTableName'),versions=values(req.responseXML,'NewActiveTableVersion');
            check(names.length===versions.length&&names.length>0,'Missing execution table versions.');
            modified=executionTables(names.map((tableName,i)=>({tableName,tableVersion:versions[i],tableComment:''}))).filter(t=>Number(t.tableVersion)<-1);
            check(modified.length>0,'No Iterator execution tables prepared.');
            const groups=await bounded(new Promise((resolve,reject)=>ConfigurationAPI.saveModifiedTables(modified,(tables,groups)=>{
                if(!tables.length||!groups||!groups.length)return reject(Error('Unable to store Iterator execution group. No Play request sent.'));
                resolve(groups);
            },false,false,false,true))); // Save/activate Iterator group, leave aliases alone.
            for(let attempt=0;attempt<20;attempt++){
                const active=await bounded(new Promise(resolve=>ConfigurationAPI.getActiveGroups(resolve)));
                if(active&&active.Iterate&&groups.some(g=>g.groupName===active.Iterate.groupName&&String(g.groupKey)===String(active.Iterate.groupKey)))return;
                await new Promise(resolve=>setTimeout(resolve,100));
            }
            throw Error('Iterator execution group activation was not verified. No Play request sent.');
        }
        return {playback:async()=>{const req=await gatewayRequest('Request?RequestType=getIterationPlanStatus','',false,true);return {status:values(req.responseXML,'active_plan_status')[0],plan:values(req.responseXML,'active_plan')[0]};},
            loadExecution,store,status:()=>request('getRemoteSubsystemStatus',{},true),
            feInfo:()=>request('getRemoteSubsystemFEMacroInfo',{targetSubsystem:SUBSYSTEM},true),
            group:async g=>TrackerRateMask.group(await request('getSpecificTableGroup',{groupName:g.name,groupKey:g.key}),g.name,g.key),
            table:async(name,version)=>TrackerRateMask.table(await request('getSpecificTable',{tableName:name,version,dataOffset:0,chunkSize:0,rawData:0,allowIllegalColumns:1}),name,version),
            structure:TrackerRateMask.structure};
    }
    root.TrackerPulserScan={build,resolve,guardPlan,browserDependencies,tracker,counts,scope,isScan,serialize,persistExecution,inspectExecution,matchesStored};
    if(typeof module!=='undefined')module.exports=root.TrackerPulserScan;
})(typeof globalThis!=='undefined'?globalThis:this);
