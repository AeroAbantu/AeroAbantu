
import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Phone, Mail, UserPlus, Shield, Target, Activity, Cpu, Database, UserCheck, X } from 'lucide-react';
import { Contact, ContactCategory } from '../types';

interface ContactsPanelProps {
  contacts: Contact[];
  setContacts: React.Dispatch<React.SetStateAction<Contact[]>>;
}

const ContactsPanel: React.FC<ContactsPanelProps> = ({ contacts, setContacts }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newContact, setNewContact] = useState({
    name: '',
    phone: '',
    email: '',
    category: ContactCategory.FRIENDS
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const contact: Contact = {
      id: Math.random().toString(36).substr(2, 9),
      ...newContact,
      enabled: true,
      priority: contacts.length,
    };
    setContacts([...contacts, contact]);
    setIsAdding(false);
    setNewContact({ name: '', phone: '', email: '', category: ContactCategory.FRIENDS });
  };

  const removeContact = (id: string) => {
    setContacts(contacts.filter(c => c.id !== id));
  };

  const toggleEnabled = (id: string) => {
    setContacts(contacts.map(c => c.id === id ? { ...c, enabled: !c.enabled } : c));
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right duration-500 pb-20">
      <div className="flex justify-between items-center glass p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border-cyan-500/30 relative overflow-hidden shadow-[0_0_30px_rgba(0,229,255,0.1)]">
        <div className="hud-corner hud-corner-tl border-cyan-500"></div>
        <div className="hud-corner hud-corner-tr border-cyan-500"></div>
        <div className="relative z-10 pr-4">
          <h2 className="text-2xl sm:text-3xl font-orbitron font-black text-cyan-400 holo-text tracking-tighter uppercase leading-none mb-2">Guardian Grid</h2>
          <div className="flex items-center space-x-2">
            <Database className="w-3 h-3 text-cyan-500/50" />
            <p className="text-[8px] sm:text-[10px] text-gray-500 uppercase font-black tracking-widest">Safety nodes • Active</p>
          </div>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="relative group p-4 sm:p-5 bg-cyan-500 text-black rounded-2xl sm:rounded-3xl hover:scale-110 active:scale-95 transition-all shadow-[0_0_30px_rgba(0,229,255,0.4)] z-10"
        >
          <UserPlus className="w-6 h-6 sm:w-7 sm:h-7" />
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleAdd} className="glass p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] space-y-6 border-cyan-500/50 animate-in fade-in zoom-in duration-300 relative overflow-hidden">
          <div className="flex items-center space-x-3 mb-2 border-b border-white/5 pb-4">
             <Cpu className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />
             <h3 className="font-orbitron font-black text-[10px] sm:text-xs uppercase tracking-[0.2em] text-cyan-400">Initialize New Node</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            <div className="space-y-1">
              <label className="text-[7px] sm:text-[8px] font-black text-gray-500 uppercase tracking-widest ml-3">Node Identity</label>
              <input 
                type="text" 
                placeholder="Full Name" 
                value={newContact.name}
                onChange={e => setNewContact({...newContact, name: e.target.value})}
                className="w-full bg-black/40 border border-white/10 rounded-xl sm:rounded-2xl p-3 sm:p-4 font-orbitron text-[10px] sm:text-xs text-white focus:outline-none focus:border-cyan-400 transition-all"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[7px] sm:text-[8px] font-black text-gray-500 uppercase tracking-widest ml-3">Tactical Frequency</label>
              <input 
                type="tel" 
                placeholder="Phone Number" 
                value={newContact.phone}
                onChange={e => setNewContact({...newContact, phone: e.target.value})}
                className="w-full bg-black/40 border border-white/10 rounded-xl sm:rounded-2xl p-3 sm:p-4 font-mono text-[10px] sm:text-xs text-cyan-400 focus:outline-none focus:border-cyan-400 transition-all"
                required
              />
            </div>
          </div>
          
          <div className="flex space-x-3 sm:space-x-4 pt-4">
            <button 
              type="submit"
              className="flex-1 bg-cyan-500 text-black font-black py-3 sm:py-4 rounded-xl sm:rounded-[1.5rem] uppercase text-[9px] sm:text-[10px] tracking-widest sm:tracking-[0.3em] active:scale-95"
            >
              Uplink Node
            </button>
            <button 
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-6 sm:px-8 bg-white/5 border border-white/10 text-gray-400 rounded-xl sm:rounded-[1.5rem] text-[9px] sm:text-[10px] font-black uppercase tracking-widest"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-1">
        {contacts.length === 0 ? (
          <div className="col-span-full glass p-12 sm:p-16 rounded-[2rem] sm:rounded-[2.5rem] border-dashed border-white/10 text-center opacity-30">
            <UserPlus className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 text-gray-600" />
            <p className="text-[9px] sm:text-xs font-black uppercase tracking-[0.4em]">No Guardians Established</p>
          </div>
        ) : (
          contacts.map(contact => (
            <div 
              key={contact.id} 
              className={`glass p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border-white/10 flex flex-col justify-between transition-all group relative overflow-hidden ${!contact.enabled ? 'opacity-40 grayscale' : 'opacity-100'}`}
            >
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <div className="flex items-center space-x-3 sm:space-x-4">
                  <div className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border ${contact.category === ContactCategory.AUTHORITIES ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'}`}>
                    {contact.category === ContactCategory.AUTHORITIES ? <Shield className="w-5 h-5 sm:w-6 sm:h-6" /> : <Target className="w-5 h-5 sm:w-6 sm:h-6" />}
                  </div>
                  <div>
                    <h4 className="font-orbitron font-black text-xs sm:text-sm text-white uppercase tracking-tight group-hover:text-cyan-400 transition-colors">{contact.name}</h4>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full ${contact.enabled ? 'bg-green-500 animate-pulse' : 'bg-gray-700'}`}></span>
                      <p className="text-[7px] sm:text-[8px] text-gray-500 uppercase font-black tracking-widest truncate max-w-[80px] sm:max-w-none">
                        {contact.category} Node
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 sm:pt-4 border-t border-white/5">
                <div className="flex space-x-1 sm:space-x-2">
                  <button 
                    onClick={() => removeContact(contact.id)}
                    className="p-2 sm:p-3 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                  >
                    <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>
                
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <span className={`text-[7px] sm:text-[8px] font-black uppercase tracking-widest ${contact.enabled ? 'text-green-500' : 'text-gray-500'}`}>
                    {contact.enabled ? 'ONLINE' : 'OFF'}
                  </span>
                  <button 
                    onClick={() => toggleEnabled(contact.id)}
                    className={`w-10 sm:w-12 h-5 sm:h-6 rounded-full relative transition-all ${contact.enabled ? 'bg-cyan-500' : 'bg-gray-800'}`}
                  >
                    <div className={`absolute top-0.5 sm:top-1 w-3.5 sm:w-4 h-3.5 sm:h-4 bg-white rounded-full transition-all ${contact.enabled ? 'right-0.5 sm:right-1' : 'left-0.5 sm:left-1'}`}></div>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ContactsPanel;
