import { Link, useNavigate } from 'react-router-dom';
import { LogOut, User } from 'lucide-react';

const Navbar = () => {
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  
  const businessStr = localStorage.getItem('business');
  const business = businessStr ? JSON.parse(businessStr) : null;

  const navigate = useNavigate();

  const handleLogout = () => {
    console.log("Logging out...");
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('business');
    navigate('/login');
    window.location.reload();
  };

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="bg-gradient-to-tr from-indigo-600 to-purple-600 p-2 rounded-xl shadow-lg shadow-indigo-100 group-hover:scale-105 transition-transform">
              <span className="font-black text-xl text-white italic leading-none block w-6 h-6 flex items-center justify-center">F</span>
            </div>
            <span className="font-black text-xl tracking-tight text-gray-900 leading-none">Finexa</span>
          </Link>

          {/* Navigation */}
          <div className="hidden md:flex items-center gap-8 ml-12">
            {[
              { name: 'Dashboard', path: '/dashboard' },
              { name: 'Trend Analysis', path: '/analysis' },
              { name: 'Anomaly', path: '/anomaly' }
            ].map((item) => (
              <Link 
                key={item.name}
                to={item.path} 
                className="text-sm font-black text-gray-400 hover:text-indigo-600 transition-all relative group py-2"
              >
                {item.name}
                <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-indigo-600 transition-all group-hover:w-full rounded-full"></div>
              </Link>
            ))}
          </div>

          <div className="flex-1"></div>

          {/* User Profile / Auth */}
          <div className="flex items-center gap-6">
            {user ? (
              <div className="flex items-center gap-4">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-sm font-black text-gray-900 leading-tight">{user?.name || "User"}</span>
                  {business && (
                    <span className="text-[9px] text-indigo-500 uppercase font-black tracking-widest leading-none mt-1">
                      {business?.businessName || "Business"}
                    </span>
                  )}
                </div>
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl flex items-center justify-center text-indigo-600 border border-indigo-100/50 shadow-sm">
                  <User size={18} />
                </div>
                <div className="h-6 w-px bg-gray-100 mx-1"></div>
                <button 
                  onClick={handleLogout}
                  className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                  title="Log Out"
                >
                  <LogOut size={20} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <Link to="/login" className="text-sm font-black text-gray-400 hover:text-indigo-600 transition-colors">Log In</Link>
                <Link 
                  to="/signup" 
                  className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-black text-sm hover:bg-indigo-700 hover:-translate-y-0.5 transition-all shadow-lg shadow-indigo-100"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
