import React, { useState, useEffect, useCallback } from 'react';
import { 
  Trophy, 
  Users, 
  Calendar, 
  Clock, 
  AlertCircle, 
  TrendingUp, 
  ExternalLink,
  RefreshCw,
  ArrowRight
} from 'lucide-react';


const TRACKED_USERS = [
  { handle: 'BurningBeast', name: 'Aditya Prabhakar' },
  { handle: '1crpaCKAGE', name: 'Aman Raj' },
  { handle: 'birnbaunsimonini', name: 'Animesh Datir' },
  { handle: 'artoonic_aditya', name: 'Aditya Chauhan' },
  // { handle: 'Petr', name: 'Petr Mitrichev' }
];

e
const getRatingStyle = (rating) => {
  if (rating < 1200) return 'font-thin italic'; // Newbie
  if (rating < 1400) return 'font-light'; // Pupil
  if (rating < 1600) return 'font-normal'; // Specialist
  if (rating < 1900) return 'font-medium'; // Expert
  if (rating < 2100) return 'font-bold'; // Candidate Master
  if (rating < 2300) return 'font-extrabold tracking-wide'; // Master
  if (rating < 2400) return 'font-black tracking-wide uppercase'; // International Master
  return 'font-black tracking-widest uppercase underline decoration-2 underline-offset-4'; // Grandmaster+
};

const formatTime = (seconds) => {
  const date = new Date(seconds * 1000);
  return date.toLocaleString([], { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

const formatDuration = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes > 0 ? `${minutes}m` : ''}`;
};

const getTimeRemaining = (startTimeSeconds) => {
  const now = Math.floor(Date.now() / 1000);
  const diff = startTimeSeconds - now;
  
  if (diff <= 0) return "Started";
  
  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h ${minutes}m`;
};


const fetchCF = async (endpoint, params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  const targetUrl = `https://codeforces.com/api/${endpoint}?${queryString}`;
  
  const strategies = [
    {
      url: (u) => `https://api.allorigins.win/get?url=${encodeURIComponent(u)}`,
      transform: (data) => JSON.parse(data.contents)
    },
    {
      url: (u) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
      transform: (data) => data
    }
  ];

  let lastError = null;

  for (const strategy of strategies) {
    try {
      const proxyUrl = strategy.url(targetUrl);
      const response = await fetch(proxyUrl);
      if (!response.ok) throw new Error(`Proxy error`);
      const rawData = await response.json();
      const resultData = strategy.transform(rawData);
      if (resultData.status === 'OK') return resultData.result;
      else throw new Error(resultData.comment || 'API Error');
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error('Connection failed.');
};



const UserCard = ({ user }) => {
  return (
    <div className="group relative p-4 md:p-6 bg-black border-2 border-white transition-all duration-300 hover:bg-white hover:text-black">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-4 md:space-x-5 w-full">
 
          <div className="relative shrink-0">
            <div className="w-12 h-12 md:w-16 md:h-16 rounded-none overflow-hidden border-2 border-white group-hover:border-black transition-colors bg-black">
              <img 
                src={user.titlePhoto !== 'https://userpic.codeforces.org/no-title.jpg' ? user.titlePhoto : user.avatar} 
                alt={user.handle}
                className="w-full h-full object-cover grayscale contrast-125"
              />
            </div>
          </div>
          
          <div className="flex-1 min-w-0 pt-0.5">
            <h3 className={`text-lg md:text-xl truncate ${getRatingStyle(user.rating)}`}>
              {user.handle}
            </h3>
            
            {user.realName && (
              <p className="text-xs md:text-sm font-bold mt-0.5 md:mt-1 group-hover:text-black transition-colors truncate">
                {user.realName}
              </p>
            )}

            <div className="flex flex-wrap items-center mt-3 gap-x-4 gap-y-2 text-[10px] md:text-xs tracking-widest uppercase font-mono pr-8">
              <div className="flex flex-col">
                <span className="mb-0.5 opacity-60">Rank</span>
                <span className="font-bold">{user.rank}</span>
              </div>
              <div className="hidden sm:block w-px h-8 bg-white group-hover:bg-black"></div>
              <div className="flex flex-col">
                <span className="mb-0.5 opacity-60">Rating</span>
                <span className="font-bold">{user.rating}</span>
              </div>
              <div className="hidden sm:block w-px h-8 bg-white group-hover:bg-black"></div>
              <div className="flex flex-col">
                <span className="mb-0.5 opacity-60">Max</span>
                <span className="font-bold">{user.maxRating}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer Link */}
      <a 
        href={`https://codeforces.com/profile/${user.handle}`}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-4 right-4 md:bottom-6 md:right-6 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0"
      >
        <ArrowRight className="text-black" size={20} strokeWidth={3} />
      </a>
    </div>
  );
};

const ContestRow = ({ contest }) => {
  const isApproaching = contest.relativeTimeSeconds > -86400; // < 24h
  
  return (
    <div className="group relative p-5 bg-black border-2 border-white mb-[-2px] hover:bg-white hover:text-black hover:z-10 transition-all duration-300">
      <div className="flex flex-col gap-3">
        <div className="flex justify-between items-start">
           <h4 className="font-bold text-sm leading-tight uppercase tracking-wider pr-4">
            {contest.name}
          </h4>
           {isApproaching && (
            <span className="shrink-0 px-2 py-0.5 bg-white text-black group-hover:bg-black group-hover:text-white border border-transparent group-hover:border-black text-[10px] font-black uppercase tracking-wider transition-colors">
              Soon
            </span>
          )}
        </div>

        <div className="flex items-end justify-between mt-2 border-t-2 border-white/20 group-hover:border-black/20 pt-2">
          <div className="space-y-1">
            <div className="flex items-center text-xs font-mono">
              <Calendar size={12} className="mr-2" />
              {formatTime(contest.startTimeSeconds)}
            </div>
            <div className="flex items-center text-xs font-mono">
              <Clock size={12} className="mr-2" />
              {formatDuration(contest.durationSeconds)}
            </div>
          </div>
          
          <div className="text-right">
             <p className="text-[9px] uppercase tracking-widest mb-1 opacity-60">Begins In</p>
             <p className="font-mono text-sm font-bold">
               {getTimeRemaining(contest.startTimeSeconds)}
             </p>
          </div>
        </div>
      </div>
      
      <a 
        href={`https://codeforces.com/contests/${contest.id}`}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute inset-0"
        aria-label="View Contest"
      />
    </div>
  );
};



export default function App() {
  const [users, setUsers] = useState([]);
  const [contests, setContests] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingContests, setLoadingContests] = useState(false);
  const [error, setError] = useState(null);

  const fetchUsers = useCallback(async () => {
    if (TRACKED_USERS.length === 0) {
      setUsers([]);
      return;
    }
    
    setLoadingUsers(true);
    setError(null);
    try {
      const handles = TRACKED_USERS.map(u => u.handle).join(';');
      const result = await fetchCF('user.info', { handles });
      
      const mergedUsers = result.map(apiUser => {
        const localData = TRACKED_USERS.find(u => u.handle.toLowerCase() === apiUser.handle.toLowerCase());
        return {
          ...apiUser,
          realName: localData ? localData.name : ''
        };
      });

      const sortedUsers = mergedUsers.sort((a, b) => b.rating - a.rating);
      setUsers(sortedUsers);
    } catch (err) {
      console.error("User fetch error:", err);
      setError("Failed to fetch user data.");
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  const fetchContests = useCallback(async () => {
    setLoadingContests(true);
    try {
      const result = await fetchCF('contest.list', { gym: false });
      const upcoming = result
        .filter(c => c.phase === 'BEFORE')
        .sort((a, b) => a.startTimeSeconds - b.startTimeSeconds);
      setContests(upcoming);
    } catch (err) {
      console.error("Contest fetch error:", err);
    } finally {
      setLoadingContests(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchContests();
  }, [fetchUsers, fetchContests]);

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-white selection:text-black">
      

      <header className="border-b-2 border-white bg-black sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between">
          <div className="flex items-center space-x-6">
            
 
            <div className="h-12 w-12 flex items-center justify-center border-2 border-white bg-black shrink-0">
               <img 
                 src="https://ui-avatars.com/api/?name=Manas&background=000&color=fff&bold=true&length=1&font-size=0.5" 
                 alt="Manas Logo" 
                 className="h-full w-full object-cover filter contrast-150"
               />
            </div>

            <div className="flex flex-col justify-center">
              <h1 className="text-2xl font-black tracking-tighter text-white uppercase italic leading-none mb-1">
                MANAS ELITE <span className="underline decoration-4 underline-offset-4 decoration-white">SOPHOMORES</span>
              </h1>
              <div className="flex items-center space-x-3 mt-1">
                 <div className="h-0.5 w-6 bg-white"></div>
                 <span className="text-white font-bold text-xs tracking-[0.3em] uppercase">CodeForces Tracker</span>
              </div>
            </div>
          </div>

          <div>
             <button 
                onClick={() => { fetchUsers(); fetchContests(); }}
                className="group p-3 bg-black hover:bg-white hover:text-black transition-all duration-300 border-2 border-white"
                title="Refresh Data"
             >
               <RefreshCw size={20} strokeWidth={3} className={`transition-transform duration-700 ${loadingUsers || loadingContests ? "animate-spin" : "group-hover:rotate-180"}`} />
             </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          

          <div className="lg:col-span-8 space-y-8">
            <div className="flex items-baseline justify-between border-b-2 border-white pb-4">
              <h2 className="text-xl font-black text-white uppercase tracking-widest flex items-center">
                <Users className="mr-3" size={24} strokeWidth={3} />
                YO MANAS
              </h2>
              <span className="font-mono text-xs font-bold bg-white text-black px-2 py-1">
                {users.length} MEMBERS
              </span>
            </div>

            {error && (
              <div className="p-4 border-2 border-white bg-black text-white text-sm flex items-center font-bold">
                <AlertCircle size={20} className="mr-3" />
                {error}
              </div>
            )}

            {loadingUsers && users.length === 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-48 border-2 border-white bg-black animate-pulse opacity-50" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {users.map(user => (
                  <UserCard key={user.handle} user={user} />
                ))}
              </div>
            )}
          </div>


          <div className="lg:col-span-4">
            <div className="lg:sticky lg:top-32 space-y-8">
              <div className="flex items-baseline justify-between border-b-2 border-white pb-4">
                <h2 className="text-xl font-black text-white uppercase tracking-widest flex items-center">
                  <Trophy className="mr-3" size={24} strokeWidth={3} />
                  CONTESTS
                </h2>
              </div>

              <div className="border-t-2 border-white">
                {loadingContests ? (
                  <div className="p-8 space-y-4 border-x-2 border-b-2 border-white">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-16 bg-white/20 animate-pulse" />
                    ))}
                  </div>
                ) : contests.length > 0 ? (
                  <div className="flex flex-col">
                    {contests.slice(0, 6).map(contest => (
                      <ContestRow key={contest.id} contest={contest} />
                    ))}
                  </div>
                ) : (
                  <div className="p-12 text-center border-x-2 border-b-2 border-white">
                    <Calendar size={32} className="mx-auto mb-4" strokeWidth={1} />
                    <p className="text-xs uppercase tracking-widest font-bold">No active signals</p>
                  </div>
                )}
                
                <a 
                  href="https://codeforces.com/contests" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block p-4 text-center text-xs font-black uppercase tracking-widest bg-white text-black hover:bg-black hover:text-white transition-colors border-2 border-white border-t-0"
                >
                  Full Schedule
                </a>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}