import style from '../../../assets/css/home/main.module.scss'
import banner from '../../../assets/images/banner.gif'
const Main = () => {
    return (
        <div className={style.main}>
            <div className={`${style.bannerContainer} parentContainer`}>
                <div className={style.banner}>
                    <img src={banner} alt="banner" />
                </div>

                <div className={`${style.bannerText} container`}>
                    <p className={style.title}>Monopoly - Board Game</p>
                    <p className={style.shortDesc}>A real-estate board board game</p>
                    <a href="/monopoly" className={style.btn}>Play Now</a>
                </div>
            </div>
            <div className={`parentContainer`}>
                <div className={`${style.info} container`}>

                    <h1 className={style.title}>Monopoly - Board Game</h1>
                    <p className={style.description}>Monopoly is a multi-player economics-themed board game. In the game, players roll two dice to move around the game board, buying and trading properties, and developing them with houses and hotels. Players collect rent from their opponents, aiming to drive them to bankruptcy.</p>
                </div>

            </div>

        </div>
    );
}

export default Main