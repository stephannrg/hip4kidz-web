import { useEffect, useState } from 'react';
import { supabase } from './lib/supabaseClient.js';

const INK = '#22252b';
const inputStyle = { width: '100%', height: 38, padding: '0 10px', border: '1px solid #e2e2e2', background: '#fff', fontSize: 14, color: INK, outline: 'none', boxSizing: 'border-box' };
const sectionTitle = { fontSize: 10.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#aaa', margin: '32px 0 16px', paddingTop: 32, borderTop: '1px solid #ececec' };
const smallBtn = { height: 36, padding: '0 18px', border: `1px solid ${INK}`, background: INK, color: '#fff', fontSize: 11.5, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' };

// entityType: 'talent' | 'booking' | 'contact' | 'package'
export default function NotesTasksAttachments({ entityType, entityId }) {
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [tasks, setTasks] = useState([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDue, setNewTaskDue] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    const { data: n } = await supabase.from('notes').select('*').eq('entity_type', entityType).eq('entity_id', entityId).order('created_at', { ascending: false });
    setNotes(n || []);
    const { data: t } = await supabase.from('tasks').select('*').eq('related_entity_type', entityType).eq('related_entity_id', entityId).order('due_date');
    setTasks(t || []);
    const { data: a } = await supabase.from('attachments').select('*').eq('entity_type', entityType).eq('entity_id', entityId).order('created_at', { ascending: false });
    setAttachments(a || []);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, entityId]);

  const addNote = async () => {
    if (!newNote.trim()) return;
    const { data: userData } = await supabase.auth.getUser();
    await supabase.from('notes').insert({ entity_type: entityType, entity_id: entityId, body: newNote.trim(), created_by: userData?.user?.id });
    setNewNote('');
    load();
  };
  const removeNote = async (id) => {
    await supabase.from('notes').delete().eq('id', id);
    setNotes((n) => n.filter((x) => x.id !== id));
  };

  const addTask = async () => {
    if (!newTaskTitle.trim()) return;
    const { data: userData } = await supabase.auth.getUser();
    await supabase.from('tasks').insert({ related_entity_type: entityType, related_entity_id: entityId, title: newTaskTitle.trim(), due_date: newTaskDue || null, created_by: userData?.user?.id });
    setNewTaskTitle('');
    setNewTaskDue('');
    load();
  };
  const toggleTask = async (task) => {
    const newStatus = task.status === 'done' ? 'open' : 'done';
    await supabase.from('tasks').update({ status: newStatus }).eq('id', task.id);
    setTasks((ts) => ts.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t)));
  };
  const removeTask = async (id) => {
    await supabase.from('tasks').delete().eq('id', id);
    setTasks((ts) => ts.filter((t) => t.id !== id));
  };

  const uploadFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const path = `${entityType}/${entityId}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from('attachments').upload(path, file);
      if (upErr) throw upErr;
      const { data: userData } = await supabase.auth.getUser();
      await supabase.from('attachments').insert({
        entity_type: entityType, entity_id: entityId,
        file_name: file.name, storage_path: path, file_size: file.size,
        created_by: userData?.user?.id,
      });
      load();
    } catch (err) {
      alert('Upload mislukt: ' + (err.message || err));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const downloadFile = async (att) => {
    const { data } = await supabase.storage.from('attachments').createSignedUrl(att.storage_path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  };

  const removeAttachment = async (att) => {
    await supabase.storage.from('attachments').remove([att.storage_path]);
    await supabase.from('attachments').delete().eq('id', att.id);
    setAttachments((a) => a.filter((x) => x.id !== att.id));
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div>
      <div style={sectionTitle}>Notes {notes.length > 0 && `(${notes.length})`}</div>
      {notes.map((n) => (
        <div key={n.id} style={{ padding: '12px 0', borderBottom: '1px solid #ececec', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontSize: 13.5 }}>{n.body}</div>
            <div style={{ fontSize: 11, color: '#999', marginTop: 5 }}>{new Date(n.created_at).toLocaleString('nl-NL')}</div>
          </div>
          <button onClick={() => removeNote(n.id)} style={{ border: 'none', background: 'none', color: '#bbb', cursor: 'pointer', fontSize: 12, flex: 'none' }}>×</button>
        </div>
      ))}
      {notes.length === 0 && <div style={{ color: '#aaa', fontSize: 13, padding: '8px 0' }}>Nog geen notities.</div>}
      <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
        <input value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Nieuwe notitie..." style={inputStyle} onKeyDown={(e) => e.key === 'Enter' && addNote()} />
        <button onClick={addNote} style={smallBtn}>Add</button>
      </div>

      <div style={sectionTitle}>Tasks {tasks.length > 0 && `(${tasks.filter((t) => t.status !== 'done').length} open)`}</div>
      {tasks.map((t) => (
        <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #ececec' }}>
          <input type="checkbox" checked={t.status === 'done'} onChange={() => toggleTask(t)} />
          <span style={{ flex: 1, fontSize: 13.5, textDecoration: t.status === 'done' ? 'line-through' : 'none', color: t.status === 'done' ? '#aaa' : INK }}>{t.title}</span>
          {t.due_date && <span style={{ fontSize: 11.5, color: '#999' }}>{t.due_date}</span>}
          <button onClick={() => removeTask(t.id)} style={{ border: 'none', background: 'none', color: '#bbb', cursor: 'pointer', fontSize: 12 }}>×</button>
        </div>
      ))}
      {tasks.length === 0 && <div style={{ color: '#aaa', fontSize: 13, padding: '8px 0' }}>Nog geen taken.</div>}
      <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
        <input value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} placeholder="Nieuwe taak..." style={inputStyle} />
        <input type="date" value={newTaskDue} onChange={(e) => setNewTaskDue(e.target.value)} style={{ ...inputStyle, width: 160 }} />
        <button onClick={addTask} style={smallBtn}>Add</button>
      </div>

      <div style={sectionTitle}>Attachments {attachments.length > 0 && `(${attachments.length})`}</div>
      {attachments.map((a) => (
        <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #ececec' }}>
          <span onClick={() => downloadFile(a)} style={{ flex: 1, fontSize: 13.5, cursor: 'pointer', textDecoration: 'underline' }}>{a.file_name}</span>
          <span style={{ fontSize: 11.5, color: '#999' }}>{formatBytes(a.file_size)}</span>
          <button onClick={() => removeAttachment(a)} style={{ border: 'none', background: 'none', color: '#bbb', cursor: 'pointer', fontSize: 12 }}>×</button>
        </div>
      ))}
      {attachments.length === 0 && <div style={{ color: '#aaa', fontSize: 13, padding: '8px 0' }}>Nog geen bijlagen.</div>}
      <div style={{ marginTop: 14 }}>
        <label style={{ ...smallBtn, display: 'inline-block', cursor: uploading ? 'default' : 'pointer', opacity: uploading ? 0.6 : 1 }}>
          {uploading ? 'Bezig...' : '+ Upload file'}
          <input type="file" onChange={uploadFile} disabled={uploading} style={{ display: 'none' }} />
        </label>
      </div>
    </div>
  );
}
