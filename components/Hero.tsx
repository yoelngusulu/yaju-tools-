"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, Droplet, FileText, Layers, MapPin, Sparkles, UploadCloud } from "lucide-react";
import { ACTIVE_TOOLS_COUNT } from "@/lib/tool-counts";

const scenes = [
  { title: "Geospatial Intelligence", tag: "GIS · REMOTE SENSING · MAPPING", icon: Layers },
  { title: "Connected Workspace", tag: "DOCUMENTS · PRODUCTIVITY · WORKFLOW", icon: FileText },
  { title: "Water & Field Intelligence", tag: "HYDROLOGY · GPS · FIELD DATA", icon: Droplet },
];

function GlobeVisual() {
  return <div className="scene-globe" aria-hidden="true">
    <div className="globe-orbit orbit-one"/><div className="globe-orbit orbit-two"/>
    <div className="globe-sphere"><div className="globe-grid"/><div className="globe-land land-one"/><div className="globe-land land-two"/><div className="globe-land land-three"/>
      <i className="globe-pulse pulse-one"/><i className="globe-pulse pulse-two"/><i className="globe-pulse pulse-three"/>
    </div>
    <div className="globe-satellite satellite-one">✦</div><div className="globe-satellite satellite-two">✦</div>
    <div className="globe-base"/>
  </div>;
}

function WorkspaceVisual() {
  return <div className="scene-workspace" aria-hidden="true">
    <div className="workspace-panel panel-back"/>
    <div className="workspace-panel panel-main">
      <div className="workspace-top"><i/><i/><i/></div>
      <div className="workspace-content"><div className="workspace-sidebar"><i/><i/><i/><i/></div><div className="workspace-board">
        <i className="workspace-tile tile-wide"/><i className="workspace-tile"/><i className="workspace-tile"/><i className="workspace-tile tile-wide"/><i className="workspace-tile"/><i className="workspace-tile"/>
      </div></div>
      <div className="workspace-chart"><Activity size={18}/><span>WORKSPACE ACTIVITY</span><div className="chart-line"/></div>
    </div>
    <div className="floating-app app-gis"><MapPin size={23}/></div><div className="floating-app app-doc"><FileText size={23}/></div><div className="floating-app app-layers"><Layers size={23}/></div>
  </div>;
}

function WaterVisual() {
  return <div className="scene-water" aria-hidden="true">
    <div className="water-rings"><i/><i/><i/></div>
    <div className="water-drop"><Droplet size={112} strokeWidth={1.1}/></div>
    <div className="water-data data-left"><span>RAINFALL</span><strong>DATA</strong><i/></div>
    <div className="water-data data-right"><span>FIELD GPS</span><strong>WGS 84</strong><i/></div>
    <div className="water-wave wave-a"/><div className="water-wave wave-b"/>
    <div className="water-pin"><MapPin size={22}/></div>
  </div>;
}

function AnimatedShowcase() {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setActive((value) => (value + 1) % scenes.length), 7000);
    return () => window.clearInterval(timer);
  }, []);
  const Icon = scenes[active].icon;
  return <div className="yaju-showcase">
    <div className="showcase-topline"><span className="live-dot"/> YAJU DIGITAL TOOLS <span className="showcase-index">0{active + 1} / 03</span></div>
    <div className="showcase-stage"><AnimatePresence mode="wait">
      <motion.div key={active} className="showcase-scene" initial={{opacity:0,y:12,scale:.98}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:-8,scale:.985}} transition={{duration:.7,ease:"easeInOut"}}>
        {active === 0 ? <GlobeVisual/> : active === 1 ? <WorkspaceVisual/> : <WaterVisual/>}
      </motion.div>
    </AnimatePresence></div>
    <div className="showcase-caption"><span className="showcase-caption-icon"><Icon size={19}/></span><div><p>{scenes[active].tag}</p><h3>{scenes[active].title}</h3></div></div>
    <div className="showcase-progress">{scenes.map((scene,index)=><button key={scene.title} type="button" onClick={()=>setActive(index)} aria-label={`Show ${scene.title}`} aria-pressed={active===index} className={active===index?"is-active":""}/>)}</div>
  </div>;
}

export default function Hero() {
  const openAIAssistant = () => window.dispatchEvent(new CustomEvent("open-docmaster-ai"));
  return <section className="yaju-hero relative isolate overflow-hidden py-14 sm:py-18 lg:py-20">
    <div className="yaju-hero-grid pointer-events-none absolute inset-0" aria-hidden="true"/>
    <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-8 px-4 sm:px-6 lg:grid-cols-2 lg:gap-8 lg:px-8">
      <motion.div initial={{opacity:0,x:-22}} animate={{opacity:1,x:0}} transition={{duration:.65}} className="text-center lg:text-left">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-400/40 bg-cyan-300/10 px-4 py-2 text-xs font-semibold tracking-wide text-cyan-200 sm:text-sm"><Sparkles size={16}/> GIS · HYDROLOGY · DOCUMENTS · FIELD TOOLS</div>
        <h1 className="text-4xl font-bold leading-[1.12] tracking-tight text-white sm:text-5xl xl:text-[3.55rem]">Practical Digital Tools for <span className="text-cyan-300">GIS, Hydrology</span> & Professional Work</h1>
        <p className="mx-auto mt-6 max-w-xl text-base leading-8 text-slate-300 sm:text-lg lg:mx-0">A growing collection of web tools that help you convert data, run key calculations, work with GIS, and handle documents — fast, accurate and easy to use.</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
          <Link href="#tools" className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-7 py-4 font-semibold text-white shadow-lg shadow-blue-950/40 transition hover:brightness-110"><UploadCloud size={19}/>Explore YAJU Tools</Link>
          <button type="button" onClick={openAIAssistant} className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-300/60 bg-white/5 px-7 py-4 font-semibold text-white transition hover:bg-cyan-300/10"><Sparkles size={19}/>Ask YAJU AI</button>
        </div>
        <div className="mt-9 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:max-w-2xl">
          {[{icon:MapPin,title:"GIS Tools",detail:"Coordinates & mapping"},{icon:Droplet,title:"Hydrology",detail:"Water calculations"},{icon:FileText,title:"Documents",detail:"PDF & file utilities"},{icon:Layers,title:"More Tools",detail:`${ACTIVE_TOOLS_COUNT} practical tools`}].map(({icon:ItemIcon,title,detail})=><div key={title} className="rounded-xl border border-white/10 bg-white/[0.045] p-3 text-left backdrop-blur-sm"><ItemIcon size={20} className="mb-2 text-cyan-300"/><p className="text-sm font-semibold text-white">{title}</p><p className="mt-1 text-xs text-slate-400">{detail}</p></div>)}
        </div>
      </motion.div>
      <motion.div initial={{opacity:0,scale:.97,x:16}} animate={{opacity:1,scale:1,x:0}} transition={{duration:.8,delay:.1}} className="mx-auto w-full max-w-[650px]"><AnimatedShowcase/></motion.div>
    </div>
    <div className="relative z-10 mx-auto mt-10 grid max-w-7xl grid-cols-2 gap-4 border-t border-cyan-300/15 px-4 pt-6 text-center sm:px-6 md:grid-cols-4 lg:px-8">{["Fast & Reliable","Secure & Private","Works on All Devices","For Professionals & Researchers"].map(item=><p key={item} className="text-xs font-medium text-slate-300 sm:text-sm">{item}</p>)}</div>
  </section>;
}
