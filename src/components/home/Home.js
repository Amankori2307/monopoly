import Footer from "./footer/Footer"
import Header from "./header/Header"
import style from '../../assets/css/home/home.module.scss'
import Main from "./main/Main";

const Home = () => {
    return (
        <div className={style.home}>
            <Header />
            <Main />
            <Footer />
        </div>
    );
}

export default Home