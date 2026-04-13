const fs = require('fs');
let content = fs.readFileSync('src/AdminPanel.tsx', 'utf8');

const targetSidebarOriginal = `<aside className="w-64 bg-gradient-to-b from-brand-950 to-brand-900 border-r border-white/5 text-white flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.1)] z-20 relative">
        <div className="p-6 border-b border-white/10">
          <h2 className="text-2xl font-serif font-bold tracking-tight text-white mb-1 glow-gold cursor-pointer" onClick={() => window.location.href='/'}>
            KALE<span className="text-gold-400 font-light">ADMIN</span>
          </h2>
          <p className="text-[10px] text-brand-300 tracking-widest uppercase relative top-[-4px]">
            {profile?.full_name || profile?.email || 'მართვის პანელი'}
          </p>
          <span className={\`mt-1 inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest \${isAdmin ? 'bg-gold-400/20 text-gold-400' : isAccountant ? 'bg-emerald-400/20 text-emerald-300' : 'bg-blue-400/20 text-blue-300'}\`}>
            {isAdmin ? 'ადმინისტრატორი' : isAccountant ? 'ბუღალტერი' : 'კონსულტანტი'}
          </span>
        </div>`;

const mySidebarReplacement = `<aside className="w-[300px] bg-admin-sidebar text-white flex flex-col shadow-2xl z-20 relative border-r border-white/5">
        <div className="pt-12 pb-14 px-8 bg-admin-sidebar-top rounded-b-[40px] shadow-[0_10px_40px_rgba(0,0,0,0.5)] relative z-10 flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-gradient-to-tr from-admin-primary to-indigo-400 rounded-full p-1 shadow-lg shadow-admin-primary/30 mb-5 relative group cursor-pointer transition-transform hover:scale-105">
            <div className="w-full h-full bg-admin-sidebar-top rounded-full flex items-center justify-center overflow-hidden border-2 border-admin-sidebar-top">
               {profile?.full_name ? <span className="text-2xl font-serif font-black text-white">{profile.full_name[0]}</span> : <span className="text-2xl font-serif font-black text-white">A</span>}
            </div>
            <div className="absolute bottom-0 right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-admin-sidebar-top"></div>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white mb-1 cursor-pointer">
            KALE<span className="text-admin-primary">ADMIN</span>
          </h2>
          <p className="text-xs text-admin-muted font-medium mb-4">
            {profile?.full_name || profile?.email || 'მართვის პანელი'}
          </p>
          <span className={\`inline-block px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest \${isAdmin ? 'bg-admin-primary/20 text-indigo-400' : isAccountant ? 'bg-emerald-400/20 text-emerald-400' : 'bg-blue-400/20 text-blue-400'}\`}>
            {isAdmin ? 'ადმინისტრატორი' : isAccountant ? 'ბუღალტერი' : 'კონსულტანტი'}
          </span>
        </div>`;

content = content.replace(targetSidebarOriginal, mySidebarReplacement);

// Navigation Links block
const navOriginal = `          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={\`w-full flex items-center space-x-3 px-4 py-3.5 rounded-xl transition-all duration-300 outline-none border-none cursor-pointer \${activeTab === tab.id ? 'bg-gold-400 text-brand-950 shadow-lg shadow-gold-400/20 translate-x-1' : 'text-brand-200 hover:bg-white/5 hover:text-white bg-transparent'}\`}
            >
              {tab.icon}
              <span className="text-sm font-semibold tracking-wide">{tab.label}</span>
            </button>
          ))}
          
          <button
            onClick={() => setActiveTab('guide')}
            className={\`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-medium \${
              activeTab === 'guide'
                ? 'bg-brand-900 shadow-xl shadow-brand-900/20 border border-brand-800 text-gold-400'
                : 'text-stone-400 hover:text-white hover:bg-brand-50'
            }\`}
          >`;

const navReplacement = `          ].map((tab: any) => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={\`w-full flex items-center space-x-4 px-8 py-4 transition-all duration-300 outline-none border-none cursor-pointer relative \${activeTab === tab.id ? 'text-white bg-white/5' : 'text-admin-muted hover:text-white hover:bg-white/[0.02] bg-transparent'}\`}
            >
              {activeTab === tab.id && (
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-admin-primary rounded-r-full shadow-[0_0_12px_var(--color-admin-primary)]"></div>
              )}
              <div className={\`flex items-center justify-center transition-colors \${activeTab === tab.id ? 'text-admin-primary' : 'text-admin-muted group-hover:text-white'}\`}>
                {tab.icon}
              </div>
              <span className="text-[13px] font-semibold tracking-wide">{tab.label}</span>
              {activeTab === tab.id && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-admin-primary shadow-[0_0_8px_var(--color-admin-primary)]"></div>}
            </button>
          ))}
          
          <button
            onClick={() => setActiveTab('guide')}
            className={\`w-full flex items-center gap-4 px-8 py-4 transition-all font-medium relative mt-2 \${
              activeTab === 'guide'
                ? 'text-white bg-white/5'
                : 'text-admin-muted hover:text-white hover:bg-white/[0.02] bg-transparent'
            }\`}
          >`;

content = content.replace(navOriginal, navReplacement);

// LogOut Button
const logoutOriginal = `<div className="p-6 border-t border-white/10 text-xs">
          <button onClick={handleLogout} className="w-full flex items-center justify-center space-x-2 p-3.5 rounded-xl bg-white/5 text-brand-200 hover:bg-red-500 hover:text-white transition-all outline-none border-none cursor-pointer">
            <LogOut size={16} />
            <span className="font-semibold tracking-wider">გასვლა</span>
          </button>
        </div>`;
const logoutReplacement = `<div className="p-6 mt-auto text-xs">
          <div className="bg-admin-sidebar-top p-6 rounded-[2rem] mb-6 text-center border border-white/5 shadow-xl relative overflow-hidden">
             <div className="absolute top-0 right-0 w-24 h-24 bg-admin-primary/10 rounded-full blur-[20px] -mr-10 -mt-10"></div>
             <div className="w-10 h-10 bg-admin-sidebar rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner border border-white/5 relative z-10">
               <span className="text-admin-primary font-black text-lg">?</span>
             </div>
             <p className="text-white font-bold text-sm mb-1 relative z-10 tracking-wide">Are you stuck?</p>
             <p className="text-admin-muted text-[10px] mb-4 relative z-10 leading-tight">Need help with the platform?<br/>Contact Support.</p>
             <button className="w-full py-3 bg-admin-primary text-white rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-admin-primary/20 hover:bg-admin-primary-hover border-none outline-none cursor-pointer relative z-10 transition-colors">Support</button>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center justify-center space-x-2 p-4 rounded-xl bg-white/5 text-admin-muted hover:bg-rose-500 hover:text-white hover:shadow-lg hover:shadow-rose-500/20 transition-all outline-none border-none cursor-pointer group">
            <LogOut size={16} className="group-hover:-translate-x-1 transition-transform" />
            <span className="font-bold tracking-widest uppercase text-[10px]">სისტემიდან გასვლა</span>
          </button>
        </div>`;
content = content.replace(logoutOriginal, logoutReplacement);

// Main background
const mainBgOriginal = `className="min-h-screen bg-slate-50 flex font-sans selection:bg-gold-400/30 overflow-hidden"`;
const mainBgReplacement = `className="min-h-screen bg-admin-bg flex font-sans selection:bg-admin-primary/30 overflow-hidden"`;
content = content.replace(mainBgOriginal, mainBgReplacement);

fs.writeFileSync('src/AdminPanel.tsx', content, 'utf8');
console.log('Sidebar UI successfully updated');
