import Board from "./components/Board";
import './assets/css/style.css';
import {connect} from 'react-redux'
import CardModal from "./components/modal/CardModal";
import {setShowModal} from './redux/actions/card'
import ModalContainer from "./components/modal/ModalCotainer";
function App({showModal, setShowModal}) {
  return (
    <div className="App">
      <Board />
      {showModal && <ModalContainer setShow={setShowModal} component={CardModal}/>}
    </div>
  );
}

const mapStateToProps = (store) => {
  return {
    showModal: store.card.showModal
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    setShowModal: (payload) => dispatch(setShowModal(payload)) 
  }
}
export default connect(mapStateToProps, mapDispatchToProps)(App);
