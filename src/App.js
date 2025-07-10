import './assets/css/style.scss';
import { connect } from 'react-redux'

import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'
import Monopoly from "./components/monopoly/Monopoly";
import Home from "./components/home/Home"
import NotFound from './components/not_found/NotFound';
function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/monopoly" element={<Monopoly />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </Router>
  );
}

const mapStateToProps = (store) => {
  return {
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
  }
}
export default connect(mapStateToProps, mapDispatchToProps)(App);
