export const genCardList = (data) => {
    return  data.map(site => {
        return {
            site,
            "selected": false,
        }
    })
}