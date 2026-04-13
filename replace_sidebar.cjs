const fs = require('fs');
let content = fs.readFileSync('src/AdminPanel.tsx', 'utf8');

const lines = content.split(/\r?\n/);
let startLine = -1;
let endLine = -1;

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('<aside')) {
        startLine = i;
    }
    if (startLine !== -1 && lines[i].includes('</aside>')) {
        endLine = i;
        break;
    }
}

if (startLine !== -1 && endLine !== -1) {
    const newSidebar = [
        '      <aside className="w-[300px] bg-admin-sidebar text-white flex flex-col shadow-2xl z-20 relative border-r border-white/5">',
        '        <div className="pt-12 pb-14 px-8 bg-admin-sidebar-top rounded-b-[40px] shadow-[0_10px_40px_rgba(0,0,0,0.5)] relative z-10 flex flex-col items-center text-center">',
        '          <div className="w-20 h-20 bg-gradient-to-tr from-admin-primary to-indigo-400 rounded-full p-1 shadow-lg shadow-admin-primary/30 mb-5 relative group cursor-pointer transition-transform hover:scale-105">',
        '            <div className="w-full h-full bg-admin-sidebar-top rounded-full flex items-center justify-center overflow-hidden border-2 border-admin-sidebar-top">',
        '               {profile?.full_name ? <span className="text-2xl font-serif font-black text-white">{profile.full_name[0]}</span> : <span className="text-2xl font-serif font-black text-white">A</span>}',
        '            </div>',
        '            <div className="absolute bottom-0 right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-admin-sidebar-top"></div>',
        '          </div>',
        '          <h2 className="text-2xl font-bold tracking-tight text-white mb-1 cursor-pointer">',
        '            KALE<span className="text-admin-primary">ADMIN</span>',
        '          </h2>',
        '          <p className="text-xs text-admin-muted font-medium mb-4">',
        '            {profile?.full_name || profile?.email || \'მართვის პანელი\'}',
        '          </p>',
        '          <span className={`inline-block px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${isAdmin ? \'bg-admin-primary/20 text-indigo-400\' : isAccountant ? \'bg-emerald-400/20 text-emerald-400\' : \'bg-blue-400/20 text-blue-400\'}`}>',
        '            {isAdmin ? \'ადმინისტრატორი\' : isAccountant ? \'ბუღალტერი\' : \'კონსულტანტი\'}',
        '          </span>',
        '        </div>',
        '',
        '        <nav className="flex-1 px-2 py-8 space-y-1 overflow-y-auto custom-scrollbar">',
        '          {[',
        '            { id: \'dashboard\', icon: <TrendingUp size={18}/>, label: \'სტატისტიკა\' },',
        '            ...(!isAccountant ? [{ id: \'products\', icon: <Package size={18}/>, label: \'პროდუქცია\' }] : []),',
        '            ...(!isAccountant ? [{ id: \'promotions\', icon: <Tag size={18}/>, label: \'აქციები\' }] : []),',
        '            ...(!isAccountant ? [{ id: \'categories\', icon: <LayoutGrid size={18}/>, label: \'კატეგორიები\' }] : []),',
        '            { id: \'orders\', icon: <ShoppingCart size={18}/>, label: \'შეკვეთები\' },',
        '            ...(!isAccountant ? [{ id: \'pos\', icon: <Store size={18}/>, label: \'შოურუმი (POS)\' }] : []),',
        '            ...(canViewAccounting ? [{ id: \'accounting\', icon: <Calculator size={18}/>, label: \'ბუღალტერია\' }] : []),',
        '            ...(canViewAccounting ? [{ id: \'manufacturing\', icon: <Factory size={18}/>, label: \'წარმოება და საწყობი\' }] : []),',
        '            ...(canManageTeam ? [{ id: \'team\', icon: <Users size={18}/>, label: \'თანამშრომლები\' }] : []),',
        '            ...(isAdmin ? [{ id: \'messages\', icon: <MessageSquare size={18}/>, label: \'შეტყობინებები\' }] : []),',
        '            ...(isAdmin ? [{ id: \'settings\', icon: <Settings size={18}/>, label: \'პარამეტრები\' }] : [])',
        '          ].map((tab: any) => (',
        '            <button ',
        '              key={tab.id}',
        '              onClick={() => setActiveTab(tab.id as any)}',
        '              className={`w-full flex items-center space-x-4 px-6 py-4 transition-all duration-300 outline-none border-none cursor-pointer relative rounded-2xl ${activeTab === tab.id ? \'text-white bg-white/5\' : \'text-admin-muted hover:text-white hover:bg-white/[0.02] bg-transparent\'}`}',
        '            >',
        '              {activeTab === tab.id && (',
        '                <div className="absolute left-0 top-2 bottom-2 w-1.5 bg-admin-primary rounded-r-full shadow-[0_0_12px_var(--color-admin-primary)]"></div>',
        '              )}',
        '              <div className={`flex items-center justify-center transition-colors ${activeTab === tab.id ? \'text-admin-primary\' : \'text-admin-muted group-hover:text-white\'}`}>',
        '                {tab.icon}',
        '              </div>',
        '              <span className="text-[13px] font-semibold tracking-wide">{tab.label}</span>',
        '              {activeTab === tab.id && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-admin-primary shadow-[0_0_8px_var(--color-admin-primary)]"></div>}',
        '            </button>',
        '          ))}',
        '          ',
        '          <button',
        '            onClick={() => setActiveTab(\'guide\')}',
        '            className={`w-full flex items-center gap-4 px-6 py-4 transition-all font-medium relative mt-2 rounded-2xl ${',
        '              activeTab === \'guide\'',
        '                ? \'text-white bg-white/5\'',
        '                : \'text-admin-muted hover:text-white hover:bg-white/[0.02] bg-transparent\'',
        '            }`}',
        '          >',
        '            {activeTab === \'guide\' && (',
        '              <div className="absolute left-0 top-2 bottom-2 w-1.5 bg-admin-primary rounded-r-full shadow-[0_0_12px_var(--color-admin-primary)]"></div>',
        '            )}',
        '            <Book size={18} className={activeTab === \'guide\' ? \'text-admin-primary\' : \'text-admin-muted\'} />',
        '            <span className="text-[13px] font-semibold">სახელმძღვანელო</span>',
        '          </button>',
        '        </nav>',
        '',
        '        <div className="p-6 mt-auto text-xs">',
        '          <div className="bg-admin-sidebar-top p-6 rounded-[2rem] mb-6 text-center border border-white/5 shadow-xl relative overflow-hidden">',
        '             <div className="absolute top-0 right-0 w-24 h-24 bg-admin-primary/10 rounded-full blur-[20px] -mr-10 -mt-10"></div>',
        '             <div className="w-10 h-10 bg-admin-sidebar rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner border border-white/5 relative z-10">',
        '               <span className="text-admin-primary font-black text-lg">?</span>',
        '             </div>',
        '             <p className="text-white font-bold text-sm mb-1 relative z-10 tracking-wide">Are you stuck?</p>',
        '             <p className="text-admin-muted text-[10px] mb-4 relative z-10 leading-tight">Need help with the platform?<br/>Contact Support.</p>',
        '             <button className="w-full py-3 bg-admin-primary text-white rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-admin-primary/20 hover:bg-admin-primary-hover border-none outline-none cursor-pointer relative z-10 transition-colors">Support</button>',
        '          </div>',
        '          <button onClick={handleLogout} className="w-full flex items-center justify-center space-x-2 p-4 rounded-xl bg-white/5 text-admin-muted hover:bg-rose-500 hover:text-white hover:shadow-lg hover:shadow-rose-500/20 transition-all outline-none border-none cursor-pointer group">',
        '            <LogOut size={16} className="group-hover:-translate-x-1 transition-transform" />',
        '            <span className="font-bold tracking-widest uppercase text-[10px]">სისტემიდან გასვლა</span>',
        '          </button>',
        '        </div>',
        '      </aside>'
    ];

    lines.splice(startLine, endLine - startLine + 1, ...newSidebar);
    fs.writeFileSync('src/AdminPanel.tsx', lines.join('\n'), 'utf8');
    console.log(`Successfully replaced lines ${startLine + 1} to ${endLine + 1}`);
} else {
    console.log('Error: Could not find aside block borders.');
}
