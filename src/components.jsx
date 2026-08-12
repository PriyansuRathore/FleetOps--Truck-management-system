import { useState } from "react";
import { motion } from "framer-motion";
import { Pencil, Sparkles, Trash2, Truck } from "lucide-react";
import { formatMoney } from "./utils.js";

export function Page({ title, kicker, children, onNewEntry }) {
  return (
    <section className="page">
      <div className="page-head">
        <div>
          <p>{kicker}</p>
          <h1>{title}</h1>
        </div>
        {onNewEntry && <button className="primary-action" onClick={onNewEntry}><Sparkles size={18} /> New Entry</button>}
      </div>
      {children}
    </section>
  );
}

export function Panel({ title, icon: Icon, children }) {
  return (
    <article className="panel">
      <div className="panel-title">
        <Icon size={20} />
        <h2>{title}</h2>
      </div>
      {children}
    </article>
  );
}

export function RouteList({ routes, onEditEntry, onRefresh }) {
  return (
    <div className="route-list">
      {routes.map((route) => (
        <motion.div className="route-item" key={route.id} whileHover={{ x: 5 }}>
          <div>
            <MapPin size={16} />
            <strong>{route.from}</strong>
            <ArrowRight size={15} />
            <strong>{route.to}</strong>
          </div>
          <section>
            <span>{route.km}</span>
            <span>{route.eta}</span>
            <span>{route.status}</span>
          </section>
          <small>{route.saving}</small>
          <RecordActions resource="routes" record={route} onEdit={onEditEntry} onRefresh={onRefresh} />
        </motion.div>
      ))}
    </div>
  );
}

export function RouteMotionMap({ routes, selectedRoute }) {
  return (
    <div className="route-motion-map">
      <div className="route-grid-lines" />
      {routes.slice(0, 3).map((route, index) => (
        <div className={`route-node node-${index + 1}`} key={route.id}>
          <span>{route.from}</span>
        </div>
      ))}
      <div className="route-node node-4">
        <span>{selectedRoute?.to || "Destination"}</span>
      </div>
      <motion.div
        className="route-glow-line"
        animate={{ opacity: [0.45, 1, 0.45] }}
        transition={{ duration: 2.4, repeat: Infinity }}
      />
      <motion.div
        className="animated-truck"
        animate={{ x: [0, 92, 190, 285], y: [0, -28, 18, -6], rotate: [0, -8, 10, 0] }}
        transition={{ duration: 6.5, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
      >
        <Truck size={30} />
      </motion.div>
      <div className="map-summary">
        <strong>{selectedRoute?.from || "Origin"} to {selectedRoute?.to || "Destination"}</strong>
        <span>{selectedRoute?.km || "-"} - {selectedRoute?.eta || "-"}</span>
      </div>
    </div>
  );
}

export function RecordActions({ resource, record, onEdit, onRefresh }) {
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!window.confirm(`Delete this ${resource} record? This cannot be undone.`)) return;
    setBusy(true);
    try {
      const session = JSON.parse(localStorage.getItem("fleetops-session") || "{}");
      const response = await fetch(`/api/${resource}/${record.id}`, {
        method: "DELETE",
        headers: session.token ? { Authorization: `Bearer ${session.token}` } : {},
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not delete record");
      onRefresh?.();
    } catch (error) {
      window.alert(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="record-actions">
      <button type="button" className="table-action edit" disabled={busy} onClick={() => onEdit?.(record)} title="Edit record"><Pencil size={14} /></button>
      <button type="button" className="table-action delete" disabled={busy} onClick={remove} title="Delete record"><Trash2 size={14} /></button>
    </div>
  );
}

export function DataTable({ columns, rows }) {
  return (
    <div className="data-table">
      <div className="data-row head" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(120px, 1fr))` }}>
        {columns.map((column) => <strong key={column}>{column}</strong>)}
      </div>
      {rows.length ? rows.map((row, index) => (
        <div className="data-row" key={index} style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(120px, 1fr))` }}>
          {row.map((cell, cellIndex) => <span key={`${index}-${cellIndex}`}>{cell}</span>)}
        </div>
      )) : <p className="table-empty">No records yet</p>}
    </div>
  );
}

export function Stat({ label, value, tone = "" }) {
  return (
    <div className={`stat ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function VerticalBars({ rows, formatter = (value) => value }) {
  const max = Math.max(...rows.map((row) => Number(row.value) || 0), 1);
  return (
    <div className="vertical-bars">
      {rows.map((row) => (
        <div className="vertical-bar" key={row.label}>
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: `${Math.max(8, (Number(row.value) / max) * 100)}%` }}
            transition={{ duration: 0.6 }}
            style={{ background: row.color }}
          />
          <strong>{formatter(row.value)}</strong>
          <span>{row.label}</span>
        </div>
      ))}
    </div>
  );
}

