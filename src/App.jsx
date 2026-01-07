import React, { useState, useEffect, useCallback } from 'react';
import { 
  Trophy, 
  Users, 
  Calendar, 
  Clock, 
  AlertCircle, 
  Target, 
  ExternalLink,
  RefreshCw,
  ArrowRight
} from 'lucide-react';

const TRACKED_USERS = [
  { handle: 'BurningBeast', name: 'Aditya Prabhakar' },
  { handle: '1crpaCKAGE', name: 'Aman Raj' },
  { handle: 'birnbaumsimonini', name: 'Animesh Datir' },
  { handle: 'artoonicpp', name: 'Aditya Chauhan' },
  { handle: 'cobra.cpp', name: 'Aniruddha Arya' },
  { handle: 'AayushRathi', name: 'Aayush Rathi' },
  { handle: 'AdityaPrasadIITG', name: 'Aditya Prasad' },
  { handle: 'achy2005', name: 'Achyuth A' },
  { handle: 'debugger6010', name: 'Aquib Aquil' },
  { handle: 'ANirudha27', name: 'Anirudha Pratap Singh' },
  { handle: 'Satoshi_Gekkouga', name: 'Abhishek Tyagi' },
];

const NON_ASSOCIATES_USERS = [
  { handle: 'catastrophic36', name: 'Aditya Deore' },
  { handle: 'Jahnavi.jnv', name: 'Jahnavi Priya' },
  { handle: 'fywer', name: 'Aditya D. Kakade' },
  { handle: 'd33p_singh', name: 'Deepenedra' },
  { handle: 'Nova85', name: 'Aadhith R' },
  { handle: 'amank_24', name: 'Aman Kumar' },
  { handle: 'dredgarheisenberg24', name: 'Aniket Mandal' },
  { handle: 'GoldenOriole', name: 'Pratyaksha Jha' },
];

const getRatingStyle = (rating) => {
  if (rating < 1200) return 'font-thin italic';
  if (rating < 1400) return 'font-light';
  if (rating < 1600) return 'font-normal';
  if (rating < 1900) return 'font-medium';
  if (rating < 2100) return 'font-bold';
  if (rating < 2300) return 'font-extrabold tracking-wide';
  if (rating < 2400) return 'font-black tracking-wide uppercase';
  return 'font-black tracking-widest uppercase underline decoration-2 underline-offset-4';
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

// --- ROBUST FETCHING LOGIC ---

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const fetchCF = async (endpoint, params = {}, retries = 3) => {
  const cacheBuster = Math.floor(Date.now() / 1000);
  const queryString = new URLSearchParams({ ...params, _: cacheBuster }).toString();
  
  // Strategy 1: Vercel Rewrite (Primary for Production)
  // Strategy 2: CorsProxy.io (Stable Fallback)
  // Strategy 3: CodeTabs (Backup)
  
  const strategies = [
    {
      name: 'Vercel Proxy',
      url: (u) => `/api/cf/${endpoint}?${queryString}`, // Relies on vercel.json rewrite
      transform: (data) => data
    },
    {
      name: 'CorsProxy',
      url: (u) => `https://corsproxy.io/?${encodeURIComponent(`https://codeforces.com/api/${endpoint}?${queryString}`)}`,
      transform: (data) => data
    },
    {
      name: 'CodeTabs',
      url: (u) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(`https://codeforces.com/api/${endpoint}?${queryString}`)}`,
      transform: (data) => data
    }
  ];

  let lastError = null;

  for (const strategy of strategies) {
    for (let i = 0; i < retries; i++) {
      try {
        const fetchUrl = strategy.url();
        const response = await fetch(fetchUrl);
        
        // If 404 on Vercel Proxy, it means we are on local dev without vercel dev, skip to next strategy
        if (strategy.name === 'Vercel Proxy' && response.status === 404) {
          throw new Error('Vercel Proxy not found (Local Dev)');
        }

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const resultData = await response.json();

        // CF API returns { status: "OK", result: ... }
        if (resultData.status === 'OK') {
          return resultData.result;
        } else {
          throw new Error(resultData.comment || 'API Error');
        }
      } catch (err) {
        lastError = err;
        // Don't retry Vercel proxy if it's missing (local dev), just move to next strategy immediately
        if (err.message.includes('Vercel Proxy')) break;
        
        // console.warn(`Attempt ${i + 1} failed with ${strategy.name}`);
        if (i < retries - 1) await delay(500 * Math.pow(2, i));
      }
    }
  }
  
  throw lastError || new Error('All connection attempts failed.');
};

async function fetchSolveCount(handle) {
  try {
    const submissions = await fetchCF("user.status", { handle, from: 1, count: 5000 });
    
    const uniqueSolved = new Set();
    const uniqueSolved24Hr = new Set();
    const now = Math.floor(Date.now() / 1000);
    const last24hr = now - 86400;

    for (let sub of submissions) {
      if (sub.verdict === "OK") {
        const problemkey = `${sub.problem.contestId}-${sub.problem.index}`;
        uniqueSolved.add(problemkey);
        if (sub.creationTimeSeconds >= last24hr) {
          uniqueSolved24Hr.add(problemkey);
        }
      }
    }

    return { alltime: uniqueSolved.size, recent: uniqueSolved24Hr.size };
  } catch (error) {
    console.warn(`Could not fetch stats for ${handle}`, error);
    return null; 
  }
}

// --- COMPONENTS ---

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
                className="w-full h-full object-cover contrast-125"
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
  const isApproaching = contest.relativeTimeSeconds > -86400;
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
  const [nonAssociates, setNonAssociates] = useState([]);
  const [contests, setContests] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingContests, setLoadingContests] = useState(false);
  const [error, setError] = useState(null);

  const [leaderRecent, setLeaderRecent] = useState([]);
  const [leaderAllTime, setLeaderAllTime] = useState([]);
  const [loadingLeader, setLoadingLeader] = useState(false);

  const fetchUsers = useCallback(async () => {
    const allTrackedUsers = [...TRACKED_USERS, ...NON_ASSOCIATES_USERS];
    
    if (allTrackedUsers.length === 0) {
      setUsers([]);
      setNonAssociates([]);
      return;
    }
    
    setLoadingUsers(true);
    setError(null);
    try {
      const handles = allTrackedUsers.map(u => u.handle).join(';');
      const result = await fetchCF('user.info', { handles }, 5);
      
      const mergedUsers = result.map(apiUser => {
        const localData = allTrackedUsers.find(u => u.handle.toLowerCase() === apiUser.handle.toLowerCase());
        return {
          ...apiUser,
          realName: localData ? localData.name : ''
        };
      });

      const associateHandles = new Set(TRACKED_USERS.map(u => u.handle.toLowerCase()));
      
      const associates = mergedUsers
        .filter(u => associateHandles.has(u.handle.toLowerCase()))
        .sort((a, b) => b.rating - a.rating);
      
      const nonAssociatesList = mergedUsers
        .filter(u => !associateHandles.has(u.handle.toLowerCase()))
        .sort((a, b) => b.rating - a.rating);

      setUsers(associates);
      setNonAssociates(nonAssociatesList);
    } catch (err) {
      console.error("User fetch error:", err);
      setError("Connection unstable. Some data may be missing.");
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  const fetchContests = useCallback(async () => {
    setLoadingContests(true);
    try {
      const result = await fetchCF('contest.list', { gym: false }, 5);
      const upcoming = result
        .filter(c => c.phase === 'BEFORE')
        .sort((a, b) => a.startTimeSeconds - b.startTimeSeconds);
      setContests(upcoming);
    } catch (err) {
      console.error("Contest fetch error:", err);
      setContests(prev => prev.length > 0 ? prev : []);
    } finally {
      setLoadingContests(false);
    }
  }, []);

  const fetchLeaderboard = useCallback(async () => {
    setLoadingLeader(true);
    const allusers = [...TRACKED_USERS, ...NON_ASSOCIATES_USERS];

    try {
      const chunkSize = 3;
      let allStats = [];

      for (let i = 0; i < allusers.length; i += chunkSize) {
        const chunk = allusers.slice(i, i + chunkSize);
        
        const chunkResults = await Promise.all(
          chunk.map(async (user) => {
            const stats = await fetchSolveCount(user.handle);
            if (!stats) return null;
            return {
              handle: user.handle,
              name: user.name,
              alltime: stats.alltime,
              recent: stats.recent
            };
          })
        );
        
        allStats = [...allStats, ...chunkResults.filter(Boolean)];
        if (i + chunkSize < allusers.length) await delay(500);
      }

      setLeaderRecent([...allStats].sort((a, b) => b.recent - a.recent));
      setLeaderAllTime([...allStats].sort((a, b) => b.alltime - a.alltime));

    } catch (err) {
      console.error("Leaderboard error:", err);
    } finally {
      setLoadingLeader(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchContests();
    fetchLeaderboard(); 
  }, [fetchUsers, fetchContests, fetchLeaderboard]);

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-white selection:text-black">
      <header className="border-b-2 border-white bg-black sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="h-12 w-12 flex items-center justify-center border-2 border-white bg-black shrink-0">
               <img 
                 src="/manas-logo.jpg" 
                 alt="Manas Logo" 
                 className="w-full h-full object-cover filter contrast-150"
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
                onClick={() => { fetchUsers(); fetchContests(); fetchLeaderboard(); }}
                className="group p-3 bg-black hover:bg-white hover:text-black transition-all duration-300 border-2 border-white"
                title="Refresh Data"
             >
               <RefreshCw size={20} strokeWidth={3} className={`transition-transform duration-700 ${loadingUsers || loadingContests || loadingLeader ? "animate-spin" : "group-hover:rotate-180"}`} />
             </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          <div className="lg:col-span-8 space-y-8">
            <div> 
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="h-48 border-2 border-white bg-black animate-pulse opacity-50" />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                    {users.map(user => (
                      <UserCard key={user.handle} user={user} />
                    ))}
                  </div>
                )}
            </div>
            
            <div className="pt-12">
                <div className="flex items-baseline justify-between border-b-2 border-white pb-4">
                  <h2 className="text-xl font-black text-white uppercase tracking-widest flex items-center">
                    <Target className="mr-3" size={24} strokeWidth={3} />
                    NON ASSOCIATES
                  </h2>
                  <span className="font-mono text-xs font-bold bg-white text-black px-2 py-1">
                    {nonAssociates.length} TRACKED
                  </span>
                </div>
                
                {loadingUsers && nonAssociates.length === 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-48 border-2 border-white bg-black animate-pulse opacity-50" />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                    {nonAssociates.map(user => (
                      <UserCard key={user.handle} user={user} />
                    ))}
                  </div>
                )}
            </div>

            {/* Leaderboard */}
            <div className="pt-12">
              <div className="flex items-baseline justify-between border-b-2 border-white pb-4">
                <h2 className="text-xl font-black text-white uppercase tracking-widest flex items-center">
                  <Trophy className="mr-3" size={24} strokeWidth={3} />
                  Leaderboard
                </h2>
              </div>

              {loadingLeader ? (
                <div className="p-6 font-mono text-sm animate-pulse">Syncing Leaderboard... (Processed in batches to ensure accuracy)</div>
              ) : (
                <div className="mt-6 space-y-10">
                  <div>
                    <h3 className="font-bold uppercase tracking-wider text-xs mb-3 opacity-70">
                      Recent — Last 24 Hours
                    </h3>
                    <div className="border-2 border-white">
                      {leaderRecent.length > 0 ? leaderRecent.map((u, i) => (
                        <div 
                          key={u.handle}
                          className="flex justify-between px-4 py-3 border-b border-white/20 hover:bg-white hover:text-black transition-all"
                        >
                          <span className="font-bold">{i + 1}. {u.handle}</span>
                          <span className="font-mono font-bold">{u.recent} solved</span>
                        </div>
                      )) : (
                        <div className="p-4 text-center text-sm font-mono opacity-50">No data available</div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold uppercase tracking-wider text-xs mb-3 opacity-70">
                      All Time Solves
                    </h3>
                    <div className="border-2 border-white">
                      {leaderAllTime.length > 0 ? leaderAllTime.map((u, i) => (
                        <div 
                          key={u.handle}
                          className="flex justify-between px-4 py-3 border-b border-white/20 hover:bg-white hover:text-black transition-all"
                        >
                          <span className="font-bold">{i + 1}. {u.handle}</span>
                          <span className="font-mono font-bold">{u.alltime} solved</span>
                        </div>
                      )) : (
                         <div className="p-4 text-center text-sm font-mono opacity-50">No data available</div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-4">
            <div className="lg:sticky lg:top-32 space-y-8">
              <div className="flex items-baseline justify-between border-b-2 border-white pb-4">
                <h2 className="text-xl font-black text-white uppercase tracking-widest flex items-center">
                  <Trophy className="mr-3" size={24} strokeWidth={3} />
                  Contests
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
                    <button onClick={fetchContests} className="mt-4 text-xs underline font-mono">Retry Signal</button>
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