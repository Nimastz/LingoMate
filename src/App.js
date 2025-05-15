
import "./style.scss";
import "./style reg.scss";
import { Register } from './pages/Register';
import { Login } from './pages/Login';
import { Home } from './pages/Home';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate} from 'react-router-dom';
import { AuthContext } from "./context/AuthContext";
import { useContext } from "react";

function App() {
  const {currentUser} = useContext(AuthContext)
  const ProtectedRoute = ({children}) => {
  if(!currentUser){
    return<Navigate to="/Login"/>
  }
  return children
}
  return (
    <BrowserRouter>
     <Routes>
        <Route path="/">
          <Route path="Login" element={<Login/>}/>
          <Route path="Register" element={<Register/>}/>
          <Route index element={
          <ProtectedRoute>
            <Home/>
          </ProtectedRoute>
          }/>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
