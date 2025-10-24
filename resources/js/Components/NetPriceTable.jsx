import React from 'react';
import { useForm, Link, router } from '@inertiajs/react';

// ===================================================================
// KOMPONEN INLINE
// ===================================================================

const PrimaryButton = ({ className = '', disabled, children, ...props }) => {
    return (
        <button
            {...props}
            className={
                `inline-flex items-center px-3 py-1.5 bg-blue-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-blue-700 focus:bg-blue-700 active:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition ease-in-out duration-150 ${disabled && 'opacity-25'
                } ` + className
            }
            disabled={disabled}
        >
            {children}
        </button>
    );
};

const InputError = ({ message, className = '', ...props }) => {
    return message ? (
        <p {...props} className={'text-sm text-red-600 ' + className}>
            {message}
        </p>
    ) : null;
};

const Pagination = ({ links = [], activeView }) => {
    if (!links || links.length <= 3) return null;

    const appendTabViewToUrl = (url) => {
        if (!url || !activeView) return url;
        try {
            const urlObject = new URL(url, window.location.origin);
            urlObject.searchParams.set('tab', activeView);
            return `${urlObject.pathname}${urlObject.search}`;
        } catch (error) {
            console.error("URL Pagination tidak valid:", url);
            return url;
        }
    };

    return (
        <div className="flex flex-wrap justify-center items-center mt-4 space-x-1">
            {links.map((link, index) => (
                <Link
                    key={index}
                    href={appendTabViewToUrl(link.url) ?? "#"}
                    className={`px-3 py-2 text-sm border rounded hover:bg-blue-600 hover:text-white transition-colors ${link.active ? "bg-blue-600 text-white" : "bg-white text-gray-700"} ${!link.url ? "text-gray-400 cursor-not-allowed" : ""}`}
                    dangerouslySetInnerHTML={{ __html: link.label }}
                    preserveScroll
                    preserveState
                />
            ))}
        </div>
    );
};

/**
 * [MODIFIKASI] Komponen Tooltip
 */
const TooltipIcon = ({ icon, tooltipText, className = '' }) => (
    // Span parent tetap 'relative'
    <span className={`relative group inline-block ${className} cursor-help`}>
        <span>{icon}</span>

        {/* [PERBAIKAN] Box Tooltip diubah posisinya */}
        <span className="
            absolute hidden group-hover:block
            top-1/2 -translate-y-1/2  /* Posisikan di tengah secara vertikal */
            left-full ml-3            /* Posisikan di KANAN ikon + margin */
            w-max max-w-xs p-3 text-xs text-white bg-gray-800 rounded-md shadow-lg z-10
            whatsapp-bubble            /* Kelas kustom untuk 'ekor' bubble */
        ">
            {tooltipText}
        </span>
    </span>
);


// ===================================================================
// Komponen Utama
// ===================================================================

const TableRow = ({ item }) => {
    const { data, setData, put, processing, errors, recentlySuccessful } = useForm({
        net_price: item.net_price || '',
        product_name: item.product_name, // Ini penting untuk update
    });

    const submit = (e) => {
        e.preventDefault();
        // Kirim 'product_name' agar update bisa membedakan order_id ganda
        put(route('admin.analysisDigitalProduct.updateNetPrice', { order_id: item.order_id, product_name: data.product_name }), {
            preserveScroll: true,
            onSuccess: () => {
                // Muat ulang halaman dengan filter yang sedang aktif
                router.get(route('admin.analysisDigitalProduct.index'), {
                    ...route().params, // Pertahankan semua filter/search/tab
                }, {
                    preserveState: true,
                    replace: true,
                });
            }
        });
    };

    // Definisikan isi tooltip
    const TEMPLATE_PRICE_TOOLTIP = (
        <div className="text-left">
            <strong className="block mb-1">Harga Template</strong>
            <p className="font-normal">Harga 0/NULL diganti menjadi:</p>
            <ul className="list-disc list-inside font-normal mt-1">
                <li>Netmonk: 26,100</li>
                <li>OCA: 104,000</li>
                <li>Antares Eazy: 35,000</li>
            </ul>
        </div>
    );

    const BUNDLING_PRICE_TOOLTIP = "product hasil bundling";

    // [LOGIKA IKON]
    const productName = item.product_name || '';
    const isBundling = productName.includes('-');
    const isTemplate = item.is_template_price == 1 && !isBundling;


    return (
        <tr className="bg-white border-b hover:bg-gray-50">
            <td className="px-4 py-2">
                <div className="flex items-center gap-1.5">
                    <span>{productName}</span>

                    {/* Tampilkan ℹ️ HANYA jika isTemplate (bukan bundling) */}
                    {isTemplate && (
                        <TooltipIcon
                            icon="ℹ️" // Ikon info
                            tooltipText={TEMPLATE_PRICE_TOOLTIP}
                        />
                    )}

                    {/* Tampilkan 📦 jika isBundling */}
                    {isBundling && (
                        <TooltipIcon
                            icon="📦"
                            tooltipText={BUNDLING_PRICE_TOOLTIP}
                        />
                    )}
                </div>
            </td>
            <td className="px-4 py-2 font-mono">{item.order_id}</td>
            <td className="px-4 py-2">{item.nama_witel}</td>
            <td className="px-4 py-2">{item.customer_name}</td>
            <td className="px-4 py-2 whitespace-nowrap">{new Date(item.order_created_date).toLocaleString('id-ID')}</td>
            <td className="px-4 py-2">
                <form onSubmit={submit} className="flex items-center gap-2">
                    <div className="flex-grow">
                        <input
                            type="number"
                            value={data.net_price}
                            onChange={(e) => setData('net_price', e.target.value)}
                            className="p-1 border rounded w-full text-sm"
                            placeholder="0"
                            step="0.01"
                            disabled={processing}
                        />
                        <InputError message={errors.net_price} className="mt-1" />
                    </div>
                    <PrimaryButton disabled={processing} className={recentlySuccessful ? 'bg-green-500 hover:bg-green-600' : ''}>
                        {processing ? '...' : (recentlySuccessful ? 'Disimpan!' : 'Simpan')}
                    </PrimaryButton>
                </form>
            </td>
        </tr>
    );
};

export default function NetPriceTable({ dataPaginator, activeView }) {
    return (
        <>
            {/* [PERBAIKAN] Tambahkan tag <style> untuk 'ekor' bubble chat */}
            <style>{`
                .whatsapp-bubble::before {
                    content: '';
                    position: absolute;
                    top: 50%;
                    right: 100%; /* Posisikan di tepi kiri bubble */
                    transform: translateY(-50%);
                    border-width: 6px;
                    border-style: solid;
                    /* Buat segitiga menunjuk ke kiri (warna bg-gray-800) */
                    border-color: transparent #1f2937 transparent transparent;
                }
            `}</style>

            <div className="overflow-x-auto text-sm">
                <table className="w-full">
                    <thead className="bg-gray-50">
                        <tr className="text-left font-semibold text-gray-600">
                            <th className="p-3">Product Name</th>
                            <th className="p-3">Order ID</th>
                            <th className="p-3">Witel</th>
                            <th className="p-3">Customer Name</th>
                            <th className="p-3">Order Created Date</th>
                            <th className="p-3 w-1/4">Edit Net Price</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y bg-white">
                        {dataPaginator && dataPaginator.data.length > 0 ? (
                            // Gunakan key yang unik untuk order_id ganda
                            dataPaginator.data.map((item) => <TableRow key={`${item.uid}-${item.product_name}`} item={item} />)
                        ) : (
                            <tr>
                                <td colSpan="6" className="p-4 text-center text-gray-500">
                                    Tidak ada data yang cocok.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            <Pagination links={dataPaginator?.links} activeView={activeView} />
        </>
    );
}
