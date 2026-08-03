$(document.body).ready(function () {

    // 1. Search Box Interaction & Suggestions Dropdown
    $('#mainSearchInput').on('focus', function () {
        $('#searchSuggestions').fadeIn(200);
    });

    $(document).on('click', function (e) {
        if (!$(e.target).closest('.search-container').length) {
            $('#searchSuggestions').fadeOut(150);
        }
    });

    $('.search-tag').on('click', function () {
        $('#mainSearchInput').val($(this).text());
        $('#searchSuggestions').fadeOut(150);
    });

    // 2. Favorite Heart Toggle Animation
    $(document).on('click', '.btn-heart', function (e) {
        e.preventDefault();
        $(this).toggleClass('active');
        const icon = $(this).find('i');
        if ($(this).hasClass('active')) {
            icon.removeClass('fa-regular').addClass('fa-solid');
        } else {
            icon.removeClass('fa-solid').addClass('fa-regular');
        }
    });

    // 3. Product Tab Filtering
    $('#productTabs button').on('click', function () {
        $('#productTabs button').removeClass('active');
        $(this).addClass('active');

        const filter = $(this).data('filter');
        if (filter === 'all') {
            $('.product-item').fadeIn(300);
        } else {
            $('.product-item').hide();
            $(`.product-item[data-category="${filter}"]`).fadeIn(300);
        }
    });

    // 4. Live Counter Incrementor
    let currentCount = 58420;
    setInterval(function () {
        currentCount += Math.floor(Math.random() * 3) + 1;
        $('#liveTransactionCount').text(currentCount.toLocaleString());
    }, 4000);

    // 5. Quick Sell Form Submission Handling
    $('#quickSellForm').on('submit', function (e) {
        e.preventDefault();
        $('#sellModal').modal('hide');
        alert('🎉 恭喜！您的二手商品已成功上架！');
        this.reset();
    });

    // 6. Load More Dummy Interaction
    $('#btnLoadMore').on('click', function () {
        const $btn = $(this);
        $btn.html('<i class="fa-solid fa-spinner fa-spin me-2"></i>載入中...');
        setTimeout(function () {
            $btn.html('已顯示全部精選商品');
            $btn.prop('disabled', true).addClass('btn-light text-muted');
        }, 1000);
    });
});
