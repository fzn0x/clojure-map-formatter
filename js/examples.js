/* Example roster. Synthetic data; addresses use example.com. */
window.EXAMPLES = [
  {
    id: 'repl',
    focus: '#{:admin',
    code: 'prn',
    title: 'REPL dump',
    note: 'One line of prn output, commas and all',
    src: '{:user {:id 42, :email "ada@example.com", :name "Ada Lovelace", :roles #{:admin :billing}, :created-at #inst "2024-03-01T10:15:00.000-00:00", :prefs {:theme :dark, :tz "Europe/London", :notify? true}}, :session/id #uuid "7d2f6c1e-3b8a-4c55-9e0d-2a6f1b9c4e71", :cart [{:sku "BK-1031", :title "Structure and Interpretation", :qty 1, :price 54.95M} {:sku "MG-0007", :title "Hammock (canvas)", :qty 1, :price 129.0M}], :flags {:beta-checkout true, :legacy-pricing false}, :last-seen nil}'
  },
  {
    id: 'deps',
    focus: '{:mvn/version "1.12.2"}',
    code: 'deps',
    title: 'deps.edn',
    note: 'Comments and blank-line groups survive',
    src: [
      ';; Project dependencies',
      '{:paths ["src" "resources" #_"dev"]',
      ' :deps {org.clojure/clojure {:mvn/version "1.12.0"}',
      '   ring/ring-jetty-adapter {:mvn/version "1.12.2"} metosin/reitit {:mvn/version "0.7.2"}',
      ' com.github.seancorfield/next.jdbc {:mvn/version "1.3.939"}}',
      '',
      ' :aliases {:dev {:extra-paths ["dev"] :extra-deps {nrepl/nrepl {:mvn/version "1.3.0"}}}',
      '  ;; run with: clj -X:test',
      '  :test {:extra-paths ["test"] :extra-deps {io.github.cognitect-labs/test-runner {:git/tag "v0.5.1" :git/sha "dfb30dd"}}',
      '         :main-opts ["-m" "cognitect.test-runner"] :exec-fn cognitect.test-runner.api/test}}}'
    ].join('\n')
  },
  {
    id: 'ring',
    focus: '{"accept"',
    code: 'req',
    title: 'Ring request',
    note: 'Nested maps of strings and keywords',
    src: '{:server-port 8080 :server-name "localhost" :remote-addr "127.0.0.1" :uri "/api/orders/1042" :query-string "expand=items" :scheme :http :request-method :get :headers {"accept" "application/edn" "host" "localhost:8080" "user-agent" "curl/8.6.0" "x-request-id" "b3f1c2d4"} :params {:expand "items"} :path-params {:id "1042"} :identity {:user/id 42 :user/roles #{:customer}}}'
  },
  {
    id: 'appdb',
    focus: '{:id 302',
    code: 'db',
    title: 're-frame app-db',
    note: 'Vectors of maps, sets of keywords',
    src: '{:route [:inbox {:folder "starred"}] :loading? false :threads [{:id 301 :subject "Release notes for 2.4" :from "maria@example.com" :unread? true :labels #{:work :release} :messages 3} {:id 302 :subject "Lunch?" :from "sam@example.com" :unread? false :labels #{} :messages 1}] :selected #{301} :drafts {} :ui {:sidebar {:collapsed? false :width 264} :toasts []}}'
  },
  {
    id: 'reader',
    focus: '[21.5',
    code: '#tag',
    title: 'Reader corners',
    note: 'Tags, metadata, chars, ratios, ##Inf',
    src: '^{:source "sensor-gateway"} {:reading/id #uuid "0b5a2c90-6f1e-4b8e-9d3a-1c2e7f4a8b60" :taken-at #inst "2025-11-02T06:30:00Z" :unit \\C :values [21.5 21.75M 43/2 22N ##Inf] :pattern #"^T-\\d{4}$" :tags #{:calibrated :outdoor} #_#_:debug true :geo #geo/point [52.3105 4.7683] :note nil}'
  },
  {
    id: 'hiccup',
    focus: '[:span.badge',
    code: '[:]',
    title: 'Hiccup view',
    note: 'Lists and vectors, deeply nested',
    src: '[:section.card {:id "order-1042"} [:header [:h2 "Order #1042"] [:span.badge {:class (when paid? "badge--paid")} "Paid"]] [:ul.items (for [{:keys [sku title qty]} items] ^{:key sku} [:li [:span.title title] [:span.qty "×" qty]])] [:footer [:button {:on-click #(rf/dispatch [:order/refund 1042]) :disabled (not refundable?)} "Refund"]]]'
  },
  {
    id: 'schema',
    focus: '#:db{',
    code: ':db/',
    title: 'Datomic schema',
    note: 'Namespaced keys and #:ns{} maps',
    src: '[{:db/ident :order/id :db/valueType :db.type/uuid :db/cardinality :db.cardinality/one :db/unique :db.unique/identity :db/doc "Public order identifier"} {:db/ident :order/items :db/valueType :db.type/ref :db/cardinality :db.cardinality/many :db/isComponent true} #:db{:ident :order/placed-at :valueType :db.type/instant :cardinality :db.cardinality/one}]'
  },
  {
    id: 'broken',
    code: '!',
    icon: 'alert',
    title: 'Broken on purpose',
    note: 'See how an error points at the spot',
    src: [
      '{:service "billing"',
      ' :retries 3',
      ' :backoff {:initial-ms 200 :max-ms 5000}',
      ' :endpoints ["https://billing.example.com"',
      '             "https://billing-2.example.com"}',
      ' :timeout-ms 1500}'
    ].join('\n')
  }
];
