/* Touch me slowly — Supabase холболтын давхарга.
   Тохиргоог supabase-config.js файлд хийнэ. Тохиргоо хийгээгүй үед
   сайт "демо горим"-оор (өгөгдөл хадгалахгүйгээр) ажиллана. */
(function () {
  var cfg = window.TMS_CONFIG || {};
  var url = String(cfg.SUPABASE_URL || "").trim().replace(/\/+$/, "");
  var key = String(cfg.SUPABASE_ANON_KEY || "").trim();
  var enabled =
    url.indexOf("https://") === 0 &&
    url.indexOf("ТАНЫ") === -1 &&
    key.length > 20 &&
    key.indexOf("ТАНЫ") === -1 &&
    typeof window.supabase !== "undefined";

  var client = enabled ? window.supabase.createClient(url, key) : null;

  function q(promise) {
    return promise.then(function (res) {
      if (res.error) throw res.error;
      return res.data;
    });
  }

  function fromDbProduct(r) {
    return {
      id: r.id, name: r.name || "", category: r.category || "", vendor: r.vendor || "",
      price: Number(r.price) || 0, discount: Number(r.discount) || 0,
      rating: Number(r.rating) || 5, stock: Number(r.stock) || 0,
      bestSeller: !!r.best_seller, image: r.image || "",
    };
  }
  function toDbProduct(p) {
    return {
      name: p.name || "", category: p.category || "", vendor: p.vendor || "",
      price: Math.round(Number(p.price) || 0), discount: Math.round(Number(p.discount) || 0),
      rating: Number(p.rating) || 5, stock: Math.round(Number(p.stock) || 0),
      best_seller: !!p.bestSeller, image: p.image || "",
    };
  }
  function toDbBrand(b) {
    return { name: b.name || "", tagline: b.tagline || "", est: b.est || "", bg: b.bg || "#F7A8C6", image: b.image || "" };
  }
  function toDbArticle(a) {
    return { title: a.title || "", excerpt: a.excerpt || "", category: a.category || "", date: a.date || "", image: a.image || "" };
  }

  window.DB = {
    enabled: enabled,
    client: client,

    loadAll: function () {
      return Promise.all([
        q(client.from("products").select("*").order("id")),
        q(client.from("brands").select("*").order("id")),
        q(client.from("articles").select("*").order("id", { ascending: false })),
        q(client.from("categories").select("*").order("id")),
        q(client.from("site_content").select("data").eq("id", 1)),
      ]).then(function (res) {
        return {
          products: (res[0] || []).map(fromDbProduct),
          brands: res[1] || [],
          articles: res[2] || [],
          categories: (res[3] || []).map(function (c) { return c.name; }),
          categoryImages: (res[3] || []).reduce(function (acc, c) {
            if (c.image) acc[c.name] = c.image;
            return acc;
          }, {}),
          content: res[4] && res[4][0] ? res[4][0].data : null,
        };
      });
    },

    fetchOrders: function () {
      return q(client.from("orders").select("*").order("created_at", { ascending: false })).then(function (rows) {
        return (rows || []).map(function (o) {
          return {
            id: o.id, date: o.date || "", items: o.items || [],
            total: Number(o.total) || 0, customer: o.customer || "", phone: o.phone || "",
            address: o.address || "", city: o.city || "", pay: o.pay || "", status: o.status || "Хүлээгдэж буй",
          };
        });
      });
    },

    placeOrder: function (o) {
      return client.rpc("place_order", {
        p_id: o.id, p_items: o.items, p_total: o.total,
        p_customer: o.customer, p_phone: o.phone,
        p_address: o.address, p_city: o.city, p_pay: o.pay,
      }).then(function (res) { if (res.error) throw res.error; });
    },

    saveProduct: function (p) {
      if (p.id) {
        return q(client.from("products").update(toDbProduct(p)).eq("id", p.id).select()).then(function () { return p.id; });
      }
      return q(client.from("products").insert(toDbProduct(p)).select()).then(function (rows) { return rows[0].id; });
    },
    saveBrand: function (b) {
      if (b.id) {
        return q(client.from("brands").update(toDbBrand(b)).eq("id", b.id).select()).then(function () { return b.id; });
      }
      return q(client.from("brands").insert(toDbBrand(b)).select()).then(function (rows) { return rows[0].id; });
    },
    saveArticle: function (a) {
      if (a.id) {
        return q(client.from("articles").update(toDbArticle(a)).eq("id", a.id).select()).then(function () { return a.id; });
      }
      return q(client.from("articles").insert(toDbArticle(a)).select()).then(function (rows) { return rows[0].id; });
    },

    deleteRow: function (table, id) {
      return q(client.from(table).delete().eq("id", id).select());
    },

    setCategoryImage: function (name, url) {
      return q(client.from("categories").update({ image: url }).eq("name", name).select());
    },

    addCategory: function (name) {
      return q(client.from("categories").insert({ name: name }).select());
    },
    deleteCategory: function (name) {
      return q(client.from("categories").delete().eq("name", name).select());
    },

    saveContent: function (data) {
      return q(client.from("site_content").upsert({ id: 1, data: data }).select());
    },

    setBestSeller: function (id, val) {
      return q(client.from("products").update({ best_seller: !!val }).eq("id", id).select());
    },

    advanceOrder: function (id, status) {
      return q(client.from("orders").update({ status: status }).eq("id", id).select());
    },

    uploadImage: function (file) {
      var ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
      var path = Date.now() + "-" + Math.random().toString(36).slice(2, 8) + "." + ext;
      return client.storage.from("images").upload(path, file, { upsert: false }).then(function (res) {
        if (res.error) throw res.error;
        return client.storage.from("images").getPublicUrl(path).data.publicUrl;
      });
    },
  };
})();
