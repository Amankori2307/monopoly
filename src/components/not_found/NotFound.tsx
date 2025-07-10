import Header from '../home/header/Header'
import Footer from '../home/footer/Footer'
import style from '../../assets/css/not_found/not-found.module.scss'
function NotFound() {
    return (
        <>
            <Header />
            <main className={style.notFound}>
                <div className={style.text}>
                    <h1 className={style.heading}>404</h1>
                    <p className={style.subHeading}>Not Found</p>
                    <p className={style.description}>The resource requested could not be found on this server!</p>
                </div>

            </main>
            <Footer />
        </>
    );
}

export default NotFound