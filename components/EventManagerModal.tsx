'use client';

import { useEffect, useState } from 'react';
import { X, Plus, Edit2, Trash2, Calendar, MapPin, ExternalLink, Ticket, Star, Check, Save } from 'lucide-react';

interface EventForm {
  title: string;
  description: string;
  categories: string[];
  location_name: string;
  location_city: string;
  location_country: string;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  website_url: string;
  ticket_url: string;
  image_url: string;
  featured: boolean;
  hatake_exhibitor: boolean;
  is_sold_out: boolean;
}

const EMPTY_FORM: EventForm = {
  title: '', description: '', categories: [], location_name: '', location_city: '',
  location_country: 'Sweden', start_date: '', end_date: '', start_time: '', end_time: '',
  website_url: '', ticket_url: '', image_url: '', featured: false, hatake_exhibitor: false, is_sold_out: false,
};

const ALL_CATEGORIES = ['pokemon','tcg','magic','tournament','convention'];

export default function EventManagerModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<'create' | 'manage'>('create');
  const [form, setForm] = useState<EventForm>(EMPTY_FORM);
  const [events, setEvents] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => { loadEvents(); }, []);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const [upRes, pastRes] = await Promise.all([
        fetch('/api/events', { credentials: 'include' }),
        fetch('/api/events?past=true', { credentials: 'include' }),
      ]);
      const upData = await upRes.json();
      const pastData = await pastRes.json();
      setEvents([...(upData.events || []), ...(pastData.events || [])]);
    } catch { setError('Failed to load events'); }
    finally { setLoading(false); }
  };

  const toggleCategory = (cat: string) => {
    setForm(f => ({
      ...f,
      categories: f.categories.includes(cat)
        ? f.categories.filter(c => c !== cat)
        : [...f.categories, cat],
    }));
  };

  const handleSave = async () => {
    if (!form.title || !form.start_date) { setError('Title and start date are required'); return; }
    setSaving(true);
    setError('');
    try {
      const method = editingId ? 'PUT' : 'POST';
      const url = editingId ? `/api/events/${editingId}` : '/api/events';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(editingId ? 'Event updated!' : 'Event created!');
        setForm(EMPTY_FORM);
        setEditingId(null);
        loadEvents();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Failed to save event');
      }
    } catch { setError('Network error'); }
    finally { setSaving(false); }
  };

  const handleEdit = (event: any) => {
    setForm({
      title: event.title || '',
      description: event.description || '',
      categories: event.categories || [],
      location_name: event.location_name || '',
      location_city: event.location_city || '',
      location_country: event.location_country || 'Sweden',
      start_date: event.start_date ? event.start_date.slice(0, 10) : '',
      end_date: event.end_date ? event.end_date.slice(0, 10) : '',
      start_time: event.start_time || '',
      end_time: event.end_time || '',
      website_url: event.website_url || '',
      ticket_url: event.ticket_url || '',
      image_url: event.image_url || '',
      featured: event.featured || false,
      hatake_exhibitor: event.hatake_exhibitor || false,
      is_sold_out: event.is_sold_out || false,
    });
    setEditingId(event.event_id);
    setTab('create');
  };

  const handleDelete = async (eventId: string) => {
    if (!confirm('Delete this event? This cannot be undone.')) return;
    try {
      await fetch(`/api/events/${eventId}`, { method: 'DELETE', credentials: 'include' });
      loadEvents();
    } catch { setError('Failed to delete'); }
  };

  const inp = 'w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-bold dark:text-white">🎪 Manage Events</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"><X className="w-5 h-5" /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {[{id:'create',label: editingId ? '✏️ Edit Event' : '+ Create Event'},{id:'manage',label:`📋 All Events (${events.length})`}].map(t=>(
            <button key={t.id} onClick={() => { setTab(t.id as any); if(t.id==='create' && !editingId) setForm(EMPTY_FORM); }}
              className={`flex-1 py-3 text-sm font-semibold transition border-b-2 ${tab===t.id?'border-blue-600 text-blue-600':'border-transparent text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {tab === 'create' ? (
            <div className="p-5 space-y-4">
              {error && <p className="text-red-500 text-sm bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>}
              {success && <p className="text-green-600 text-sm bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-lg">✅ {success}</p>}

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Event Title *</label>
                <input className={inp} placeholder="Svenska Pokémonmässan 2026" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Description</label>
                <textarea className={inp} rows={3} placeholder="What's this event about?" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Categories</label>
                <div className="flex flex-wrap gap-2">
                  {ALL_CATEGORIES.map(cat=>(
                    <button key={cat} onClick={()=>toggleCategory(cat)}
                      className={`px-3 py-1 text-xs rounded-full font-medium transition ${form.categories.includes(cat)?'bg-blue-600 text-white':'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'}`}>
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Venue Name</label>
                  <input className={inp} placeholder="RC Arena" value={form.location_name} onChange={e=>setForm(f=>({...f,location_name:e.target.value}))} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">City</label>
                  <input className={inp} placeholder="Göteborg" value={form.location_city} onChange={e=>setForm(f=>({...f,location_city:e.target.value}))} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Start Date *</label>
                  <input type="date" className={inp} value={form.start_date} onChange={e=>setForm(f=>({...f,start_date:e.target.value}))} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">End Date</label>
                  <input type="date" className={inp} value={form.end_date} onChange={e=>setForm(f=>({...f,end_date:e.target.value}))} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Start Time</label>
                  <input type="time" className={inp} value={form.start_time} onChange={e=>setForm(f=>({...f,start_time:e.target.value}))} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">End Time</label>
                  <input type="time" className={inp} value={form.end_time} onChange={e=>setForm(f=>({...f,end_time:e.target.value}))} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Website URL</label>
                  <input className={inp} placeholder="https://..." value={form.website_url} onChange={e=>setForm(f=>({...f,website_url:e.target.value}))} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Ticket URL</label>
                  <input className={inp} placeholder="https://tickets..." value={form.ticket_url} onChange={e=>setForm(f=>({...f,ticket_url:e.target.value}))} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Image URL</label>
                <input className={inp} placeholder="https://image.png" value={form.image_url} onChange={e=>setForm(f=>({...f,image_url:e.target.value}))} />
              </div>

              <div className="flex flex-wrap gap-3">
                {([['featured','⭐ Featured'],['hatake_exhibitor','🏪 Hatake Here!'],['is_sold_out','🔴 Sold Out']] as [keyof EventForm, string][]).map(([key,label])=>(
                  <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={form[key] as boolean} onChange={e=>setForm(f=>({...f,[key]:e.target.checked}))} className="w-4 h-4 rounded text-blue-600" />
                    <span className="text-sm dark:text-white">{label}</span>
                  </label>
                ))}
              </div>

              <div className="flex gap-3">
                {editingId && (
                  <button onClick={()=>{setForm(EMPTY_FORM);setEditingId(null);}} className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-white">
                    Cancel Edit
                  </button>
                )}
                <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition">
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : editingId ? 'Update Event' : 'Create Event'}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4">
              {loading ? (
                <div className="text-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"/></div>
              ) : events.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p>No events yet. Create your first event!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {events.map(event=>(
                    <div key={event.event_id} className="flex items-start gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm dark:text-white truncate">{event.title}</p>
                          {event.is_past && <span className="text-xs text-gray-400">(past)</span>}
                          {event.featured && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500"/>}
                          {event.hatake_exhibitor && <span className="text-xs text-blue-600">🏪</span>}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {event.start_date?.slice(0,10)} · {[event.location_name, event.location_city].filter(Boolean).join(', ')}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {(event.categories||[]).map((c:string)=>(
                            <span key={c} className="text-[10px] px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full">{c}</span>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={()=>handleEdit(event)} className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg text-blue-600 transition"><Edit2 className="w-4 h-4"/></button>
                        <button onClick={()=>handleDelete(event.event_id)} className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg text-red-500 transition"><Trash2 className="w-4 h-4"/></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
