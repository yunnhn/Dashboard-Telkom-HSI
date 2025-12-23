// resources/js/Components/InProgressTable.jsx

import React from 'react';
import { router } from '@inertiajs/react';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import Pagination from '@/Components/Pagination'; // Pastikan path ini benar

// Inisialisasi MySwal untuk digunakan di dalam komponen ini
const MySwal = withReactContent(Swal);

// Asumsi Anda memiliki fungsi utilitas ini di file terpisah
const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('id-ID', options);
};

const InProgressAnalysisTable = ({ dataPaginator = { data: [], links: [], from: 0 }, activeView }) => {
    const handleCompleteClick = async (orderId) => {
        const result = await MySwal.fire({
            title: 'Konfirmasi Order Selesai',
            text: `Anda yakin ingin mengubah status Order ID ${orderId} menjadi "COMPLETE"?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#28a745',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Ya, Selesaikan!',
            cancelButtonText: 'Batal'
        });

        if (result.isConfirmed) {
            router.put(
                route("admin.manual.update.complete", { order_id: orderId }),
                {},
                {
                    preserveScroll: true,
                    onSuccess: () => {
                        toast.success(`Order ID ${orderId} berhasil di-complete.`);
                        router.reload({ preserveState: false });
                    },
                    onError: () => toast.error(`Gagal mengubah status Order ID ${orderId}.`)
                },
            );
        }
    };

    const handleCancelClick = async (orderId) => {
        const result = await MySwal.fire({
            title: 'Konfirmasi Pembatalan',
            text: `Anda yakin ingin mengubah status Order ID ${orderId} menjadi "CANCEL"?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Ya, Batalkan!',
            cancelButtonText: 'Kembali'
        });

        if (result.isConfirmed) {
            router.put(
                route("admin.manual.update.cancel", { order_id: orderId }),
                {},
                {
                    preserveScroll: true,
                    onSuccess: () => {
                        toast.success(`Order ID ${orderId} berhasil di-cancel.`);
                        router.reload({ preserveState: false });
                    },
                    onError: () => toast.error(`Gagal membatalkan Order ID ${orderId}.`)
                },
            );
        }
    };

    return (
        <>
            <div className="overflow-x-auto text-sm">
                <table className="w-full">
                    <thead className="bg-gray-50">
                        <tr className="text-left font-semibold text-gray-600">
                            <th className="p-3">No.</th>
                            <th className="p-3">Milestone</th>
                            <th className="p-3">Status Order</th>
                            <th className="p-3">Product Name</th>
                            <th className="p-3">Order ID</th>
                            <th className="p-3">Witel</th>
                            <th className="p-3">Branch</th>
                            <th className="p-3">Customer Name</th>
                            <th className="p-3">Order Created Date</th>
                            <th className="p-3 text-center">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y bg-white">
                        {dataPaginator.data.length > 0 ? (
                            dataPaginator.data.map((item, index) => (
                                <tr
                                    key={item.order_id}
                                    className="text-gray-700 hover:bg-gray-50"
                                >
                                    <td className="p-3">
                                        {dataPaginator.from + index}
                                    </td>
                                    <td className="p-3">{item.milestone}</td>
                                    <td className="p-3 whitespace-nowrap">
                                        <span className="px-2 py-1 text-xs font-semibold leading-tight text-blue-700 bg-blue-100 rounded-full">
                                            {item.order_status_n}
                                        </span>
                                    </td>
                                    <td className="p-3">
                                        {item.product_name ?? item.product}
                                    </td>
                                    <td className="p-3 font-mono">
                                        {item.order_id}
                                    </td>
                                    <td className="p-3">{item.nama_witel}</td>
                                    <td className="p-3">{item.telda || 'Non-Telda (NCX)'}</td>
                                    <td className="p-3">
                                        {item.customer_name}
                                    </td>
                                    <td className="p-3">
                                        {formatDate(item.order_created_date)}
                                    </td>
                                    <td className="p-3 text-center">
                                        <div className="flex justify-center items-center gap-2">
                                            <button
                                                onClick={() =>
                                                    handleCompleteClick(
                                                        item.order_id,
                                                    )
                                                }
                                                className="px-3 py-1 text-xs font-bold text-white bg-green-500 rounded-md hover:bg-green-600"
                                            >
                                                COMPLETE
                                            </button>
                                            <button
                                                onClick={() =>
                                                    handleCancelClick(
                                                        item.order_id,
                                                    )
                                                }
                                                className="px-3 py-1 text-xs font-bold text-white bg-red-500 rounded-md hover:bg-red-600"
                                            >
                                                CANCEL
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td
                                    colSpan="9"
                                    className="p-4 text-center text-gray-500"
                                >
                                    Tidak ada data yang sesuai dengan filter.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            <Pagination links={dataPaginator.links} activeView={activeView}/>
        </>
    );
};

export default InProgressAnalysisTable;
