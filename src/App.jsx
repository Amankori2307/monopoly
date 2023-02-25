import "./assets/css/style.scss";

import { BrowserRouter as Router, Route, Switch } from "react-router-dom";
import Home from "./components/home/Home";
import Monopoly from "./components/monopoly/Monopoly";
import NotFound from "./components/not_found/NotFound";
function App() {
  return (
    <Router>
      <div className="App">
        <Switch>
          <Route exact path="/" component={Home} />
          <Route path="/monopoly" component={Monopoly} />
          <Route path="*" component={NotFound} />
        </Switch>
      </div>
    </Router>
  );
}

export default App;
