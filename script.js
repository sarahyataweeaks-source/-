/* ==========================================================================
   script.js — ใช้ร่วมกันทุกหน้า
   ตรวจจาก id ของ element ว่าอยู่หน้าไหน แล้วทำงานเฉพาะส่วนของหน้านั้น
     product.html : #filter-bar, #product-list
     order.html   : #orderForm, #customerName, #contact, #items, #total, #note
     admin.html   : #ordersTable tbody
   ========================================================================== */

(function () {
  'use strict';

  /* ---------- ค่าตั้งต้น ---------- */
  var SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx0EMtVn8wsZxdFa6UZVtH9EJDto7ek_Z3kNuhptc70Z40wzvaIWD9DC6ExkdfN7mHE/exec';
  var CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTJePWn25wre07OZ28OyAyGOqxDCK3-oKCjAC3XGvu9ElLBKBBc5vn6zGCC4Mxr9oScHD5sLUBFMCaD/pub?gid=0&single=true&output=csv';

  var MOOD_KEYS = ['fresh', 'sweet', 'confident', 'romance'];

  // products.json เก็บ mood เป็นชื่อสินค้า จึงแปลงเป็นกลุ่ม mood ตรงนี้
  var MOOD_BY_PRODUCT = {
    'มาม่าหมูสับ': 'fresh',
    'ไวไวต้มยำกุ้ง': 'sweet',
    'ยำยำช้างน้อย': 'confident'
  };

  /* ======================================================================
     1) product.html — โหลดสินค้า แสดงการ์ด และกรองตาม mood
     ====================================================================== */
  function initProductPage() {
    var filterBar = document.getElementById('filter-bar');
    var list = document.getElementById('product-list');
    var products = [];

    function moodKey(product) {
      return MOOD_BY_PRODUCT[product.mood] || String(product.mood).toLowerCase();
    }

    function showMessage(text) {
      var p = document.createElement('p');
      p.className = 'empty-state';
      p.textContent = text;
      list.replaceChildren(p);
    }

    function buildCard(product) {
      var itemName = product.name + ' ' + product.size;

      var card = document.createElement('article');
      card.className = 'product-card';
      card.setAttribute('data-mood', moodKey(product));

      var media = document.createElement('div');
      media.className = 'product-card__media';
      var img = document.createElement('img');
      img.src = product.image;
      img.alt = product.name;
      img.loading = 'lazy';
      img.addEventListener('error', function () { img.style.visibility = 'hidden'; });
      media.appendChild(img);

      var body = document.createElement('div');
      body.className = 'product-card__body';

      var title = document.createElement('h3');
      title.className = 'product-card__title';
      title.textContent = product.name;

      var meta = document.createElement('p');
      meta.className = 'product-card__meta';
      meta.textContent = 'ขนาด ' + product.size;

      var footer = document.createElement('div');
      footer.className = 'product-card__footer';

      var price = document.createElement('span');
      price.className = 'price';
      price.textContent = product.price;
      var unit = document.createElement('small');
      unit.textContent = 'บาท';
      price.appendChild(unit);

      // ลิงก์ไปหน้าสั่งซื้อ พร้อมส่ง item และ price
      var buy = document.createElement('a');
      buy.className = 'btn';
      buy.textContent = 'สั่งซื้อ';
      buy.href = 'order.html?item=' + encodeURIComponent(itemName) +
                 '&price=' + encodeURIComponent(product.price);

      footer.appendChild(price);
      footer.appendChild(buy);
      body.appendChild(title);
      body.appendChild(meta);
      body.appendChild(footer);
      card.appendChild(media);
      card.appendChild(body);
      return card;
    }

    function render(filter) {
      var shown = products.filter(function (p) {
        return filter === 'all' || moodKey(p) === filter;
      });

      if (shown.length === 0) {
        showMessage('ยังไม่มีสินค้าในหมวดนี้');
      } else {
        list.replaceChildren.apply(list, shown.map(buildCard));
      }

      filterBar.querySelectorAll('.filter-btn').forEach(function (btn) {
        btn.setAttribute('aria-pressed', btn.getAttribute('data-filter') === filter ? 'true' : 'false');
      });
    }

    function setFilter(filter, updateUrl) {
      render(filter);
      if (updateUrl) {
        var url = new URL(window.location.href);
        if (filter === 'all') {
          url.searchParams.delete('mood');
        } else {
          url.searchParams.set('mood', filter);
        }
        history.replaceState(null, '', url);
      }
    }

    filterBar.addEventListener('click', function (event) {
      var btn = event.target.closest('.filter-btn');
      if (btn) setFilter(btn.getAttribute('data-filter'), true);
    });

    // ?mood=xxx กรองอัตโนมัติตอนโหลดหน้า (ค่าที่ไม่รู้จักถือเป็น "ทั้งหมด")
    var param = (new URLSearchParams(window.location.search).get('mood') || 'all').toLowerCase();
    var initialFilter = MOOD_KEYS.indexOf(param) !== -1 ? param : 'all';

    showMessage('กำลังโหลดสินค้า...');

    fetch('products.json')
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        products = data;
        setFilter(initialFilter, false);
      })
      .catch(function (error) {
        console.error(error);
        showMessage('โหลดข้อมูลสินค้าไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
      });
  }

  /* ======================================================================
     2) order.html — เติม items/total จาก URL และส่งออเดอร์
     ====================================================================== */
  function initOrderPage() {
    var form = document.getElementById('orderForm');
    var submitBtn = form.querySelector('button[type="submit"]');

    // เติมทั้งชื่อสินค้า (#items) และราคา (#total) ทันทีที่โหลดหน้า
    var params = new URLSearchParams(window.location.search);
    var item = params.get('item');
    var price = params.get('price');
    if (item !== null) document.getElementById('items').value = item;
    if (price !== null) document.getElementById('total').value = price;

    form.addEventListener('submit', function (event) {
      event.preventDefault();

      var payload = {
        customerName: document.getElementById('customerName').value.trim(),
        contact: document.getElementById('contact').value.trim(),
        items: document.getElementById('items').value.trim(),
        total: document.getElementById('total').value.trim(),
        note: document.getElementById('note').value.trim()
      };

      if (submitBtn) submitBtn.disabled = true;

      // pattern ที่ทดสอบแล้วกับ Apps Script: ไม่ตั้ง headers และไม่ใช้ no-cors
      fetch(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify(payload)
      })
      .then(() => { window.location.href = 'thankyou.html'; })
      .catch(error => {
        console.error(error);
        alert('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
        if (submitBtn) submitBtn.disabled = false;
      });
    });
  }

  /* ======================================================================
     3) admin.html — ดึง CSV จาก Google Sheet มาแสดงเป็นตาราง
     ====================================================================== */

  // แปลง CSV เป็น array ของแถว รองรับ field ในเครื่องหมายคำพูด, "" และขึ้นบรรทัดใหม่ใน field
  function parseCSV(text) {
    var rows = [];
    var row = [];
    var field = '';
    var inQuotes = false;

    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);

    for (var i = 0; i < text.length; i++) {
      var c = text[i];

      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; }
          else { inQuotes = false; }
        } else {
          field += c;
        }
      } else if (c === '"') {
        inQuotes = true;
      } else if (c === ',') {
        row.push(field);
        field = '';
      } else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
      } else {
        field += c;
      }
    }

    if (field !== '' || row.length > 0) {
      row.push(field);
      rows.push(row);
    }

    return rows.filter(function (r) {
      return r.some(function (cell) { return cell.trim() !== ''; });
    });
  }

  function initAdminPage() {
    var tbody = document.querySelector('#ordersTable tbody');
    var statusEl = document.getElementById('status');      // ไม่บังคับ
    var refreshBtn = document.getElementById('refresh');   // ไม่บังคับ

    function setStatus(text) {
      if (statusEl) statusEl.textContent = text;
    }

    function makeCell(text, className) {
      var td = document.createElement('td');
      td.textContent = text;
      if (className) td.className = className;
      return td;
    }

    function formatTotal(value) {
      var n = Number(String(value).replace(/,/g, ''));
      return value !== '' && !isNaN(n) ? n.toLocaleString('th-TH') : value;
    }

    function showEmpty(text) {
      var tr = document.createElement('tr');
      var td = makeCell(text, 'empty-state');
      td.colSpan = 6;
      tr.appendChild(td);
      tbody.replaceChildren(tr);
    }

    function render(rows) {
      // แถวแรกคือหัวตาราง; ชีตเพิ่มรายการใหม่ต่อท้าย จึงกลับลำดับให้ล่าสุดขึ้นก่อน
      var orders = rows.slice(1).reverse();

      if (orders.length === 0) {
        showEmpty('ยังไม่มีรายการสั่งซื้อ');
        setStatus('ยังไม่มีรายการสั่งซื้อ');
        return;
      }

      var trs = orders.map(function (r) {
        var tr = document.createElement('tr');
        tr.appendChild(makeCell(r[0] || ''));                          // วันเวลา
        tr.appendChild(makeCell(r[1] || ''));                          // ชื่อลูกค้า
        tr.appendChild(makeCell(r[2] || ''));                          // เบอร์โทร/Line
        tr.appendChild(makeCell(r[3] || ''));                          // รายการสินค้า
        tr.appendChild(makeCell(formatTotal(r[4] || ''), 'num'));      // จำนวนเงินรวม
        tr.appendChild(makeCell(r[5] || '', 'note-cell'));             // หมายเหตุ
        return tr;
      });

      tbody.replaceChildren.apply(tbody, trs);
      setStatus('ทั้งหมด ' + orders.length + ' รายการ (ล่าสุดอยู่บนสุด)');
    }

    function load() {
      if (refreshBtn) refreshBtn.disabled = true;
      setStatus('กำลังโหลดข้อมูล...');

      fetch(CSV_URL)
        .then(function (res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return res.text();
        })
        .then(function (text) { render(parseCSV(text)); })
        .catch(function (error) {
          console.error(error);
          showEmpty('โหลดข้อมูลไม่สำเร็จ');
          setStatus('โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
        })
        .then(function () { if (refreshBtn) refreshBtn.disabled = false; });
    }

    if (refreshBtn) refreshBtn.addEventListener('click', load);
    load();
  }

  /* ---------- เริ่มทำงานตามหน้า ---------- */
  function init() {
    if (document.getElementById('filter-bar') && document.getElementById('product-list')) {
      initProductPage();
    }
    if (document.getElementById('orderForm')) {
      initOrderPage();
    }
    if (document.querySelector('#ordersTable tbody')) {
      initAdminPage();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
