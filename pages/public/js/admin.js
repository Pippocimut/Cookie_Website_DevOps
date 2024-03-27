const deleteProduct = (btn) => {
    const productId = btn.parentNode.querySelector('[name = productId]').value;
    const csrf = btn.parentNode.querySelector('[name = _csrf]').value;

    const element = btn.closest('article')

    fetch('/admin/product/'+productId,{
        method:'DELETE',
        headers: {
            'csrf-token': csrf
        }
    }).then(result => {
        console.log(result);
    }).then( data => {
        element.parentNode.removeChild(elementj)
    }).catch(err => {
        console.log(err);
    });
};