import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import style from '../../../assets/css/my-cards.module.scss';
import { IState } from '../../../redux/reducers/rootReducer';
import CardModal from './CardModal';
const MyCards = () => {
  const playersSites = useSelector(
    (store: IState) => store.siteData.playersSites
  );
  const playerIdForMyCardsModal = useSelector(
    (store: IState) => store.modalData.playerIdForMyCardsModal
  );

  const [groupedCards, setGroupedCards] = useState({});
  const [activeTab, setActiveTab] = useState('all');
  const [cardList, setCardList] = useState([]);
  useEffect(() => {
    const myCards = playersSites[playerIdForMyCardsModal];
    const _groupedCards = {};
    _groupedCards['all'] = myCards;
    for (let i = 0; i < myCards.length; i++) {
      let subType = myCards[i].subType;
      subType = subType.replace('_', ' ');
      if (!_groupedCards[subType]) _groupedCards[subType] = [];
      _groupedCards[subType].push(myCards[i]);
    }
    setCardList(_groupedCards['all']);
    setGroupedCards(_groupedCards);
  }, [playersSites, playerIdForMyCardsModal]);

  const changeTab = (tabName) => {
    setActiveTab(tabName);
    setCardList(groupedCards[tabName]);
  };
  return (
    <>
      {cardList.length === 0 ? (
        <div className={style.noCards}>
          <p>No cards</p>
        </div>
      ) : (
        <div className={style.myCards}>
          <div className={style.navigationContainer}>
            <ul className={style.tabNavigation}>
              {Object.keys(groupedCards).map((tabName, index) => (
                <li key={index}>
                  <button
                    onClick={() => changeTab(tabName)}
                    className={activeTab === tabName ? style.activeTab : ''}
                  >
                    {tabName}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className={style.cardList}>
            {cardList.map((card, index) => (
              <CardModal card={card} key={index} />
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default MyCards;
