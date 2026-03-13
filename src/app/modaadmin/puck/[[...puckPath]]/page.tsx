"use client";

import { Puck } from "@puckeditor/core";
import "@puckeditor/core/puck.css";
import { puckConfig } from "@/lib/puck.config";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function PuckEditor() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch('/api/puck')
      .then(res => res.json())
      .then(json => {
         setData(json || {});
      });
  }, []);

  const save = async (data: any) => {
    await fetch('/api/puck', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    alert('Diseño guardado correctamente!');
  };

  if (!data) return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
        <p className="text-xl font-medium text-gray-400">Loading visual editor...</p>
    </div>
  );

  return (
    <div className="h-screen flex flex-col">
       <div className="bg-black text-white px-4 py-2 flex justify-between items-center text-sm font-medium">
           <span>Puck Storefront Builder</span>
           <Link href="/modaadmin" className="hover:underline opacity-80 transition-opacity hover:opacity-100">
             ← Volver a Ajustes Globales
           </Link>
       </div>
       <div className="flex-1">
           <Puck 
               config={puckConfig as any} 
               data={data} 
               onPublish={save} 
           />
       </div>
    </div>
  );
}
