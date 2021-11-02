import React from 'react'
import style from '../../../../assets/css/trade-card-modal.module.css'
import CardListItem from './CardListItem'
const CardList = ({cardList, listName, onSelect, selectedCards, playerId}) => {
    return (
        <div className={style.cardListContainer}>
            <p className={style.cardListHeading}>Player {playerId} Cards</p>
            <div className={style.cardList}>
                {cardList.map(cardData => <CardListItem key={cardData.site.id} cardData={cardData} listName={listName} onSelect={onSelect}/>)}  
            </div>
            <p className={`${style.cardListInfo} ${style.cardListHeading}`}>{listName==="otherPlayer"?"Asking":"Giving"} {selectedCards}/{cardList.length} cards</p>

        </div>
    ) 
}

export default CardList