import React from 'react'
import style from '../../../../assets/css/trade-card-modal.module.css'
import CardListItem from './CardListItem'
const CardList = ({cardList, listName, onSelect, selectedCards}) => {
    return (
        <div className={style.cardListContainer}>
            <p className={style.cardListInfo}>{listName==="otherPlayer"?"Asking":"Giving"} {selectedCards}/{cardList.length} cards</p>
            <div className={style.cardList}>
                {cardList.map(cardData => <CardListItem key={cardData.site.id} cardData={cardData} listName={listName} onSelect={onSelect}/>)}  
            </div>

        </div>
    ) 
}

export default CardList