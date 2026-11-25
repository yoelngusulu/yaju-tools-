"use client";

import { motion } from "framer-motion";
import { BookOpen, Layers, MapPinned, MousePointerClick } from "lucide-react";

const features = [
  { icon: Layers, title: "One Practical Workspace", description: "Find useful document, GIS, fieldwork and digital utility tools together instead of moving between multiple websites for everyday tasks." },
  { icon: BookOpen, title: "Support for Learning", description: "Prepare and organize lecture notes, assignments, reports and training materials with practical document tools and learning resources." },
  { icon: MapPinned, title: "Tools for Technical Work", description: "Work with coordinates, coordinate reference systems, measurements, GIS tasks and water storage estimates in one accessible platform." },
  { icon: MousePointerClick, title: "Simple to Get Started", description: "Open tools directly in your browser, follow the instructions provided and review your results before using or sharing them." },
];

export default function Features() {
  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }} viewport={{ once: true, amount: 0.3 }} className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">Why Choose YAJU</p>
          <h2 className="mt-3 text-3xl font-bold text-slate-900 sm:text-4xl">Less Time Switching. More Time Getting Things Done.</h2>
          <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">YAJU brings practical digital tools and helpful resources into one accessible place, helping you handle common tasks for work, study and technical projects with less friction.</p>
        </motion.div>
        <div className="mt-11 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.article key={feature.title} initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: index * 0.08 }} viewport={{ once: true, amount: 0.2 }} whileHover={{ y: -5 }} className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:border-blue-200 hover:shadow-lg">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-700 transition-colors group-hover:bg-blue-600 group-hover:text-white"><Icon size={25} /></div>
                <h3 className="mt-5 text-lg font-bold text-slate-900">{feature.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{feature.description}</p>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
