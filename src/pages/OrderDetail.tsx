import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { useAuthContext } from "../context/AuthContext";
import { useApi } from "../services/api";
interface OrderItem {
  id: number;
  product_name: string;
  quantity: number;
  total_price: number;
}

interface Address {
  full_name: string;
  phone_number: string;
  address_line: string;
  landmark: string;
  city: string;
  pincode: string;
}

interface OrderDetailType {
  id: number;
  status: string;
  total_amount: string;
  created_at: string;
  payment_method: string;
  is_paid: boolean;
  items: OrderItem[];
  address?: Address;
}
export default function OrderDetail() {

  const { id } = useParams<{ id: string }>();
  const { user } = useAuthContext();
  const { apiRequest } = useApi();

  const [order, setOrder] = useState<OrderDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundReason, setRefundReason] = useState("");
  const [refundDescription, setRefundDescription] = useState("");

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<"image" | "video" | null>(null);

  const [refundFile, setRefundFile] = useState<File | null>(null);
  const [submittingRefund, setSubmittingRefund] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const loadOrder = async () => {
    if (!id || !user) return;

    try {
      setLoading(true);

      const data = await apiRequest<OrderDetailType>(`/orders/${id}/`);
      setOrder(data || null);

    } catch (err) {
      console.error(" Order fetch error:", err);
      setError("Failed to load order");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) loadOrder();
  }, [id, user]);
  const cancelOrder = async () => {
    if (!window.confirm("Cancel this order?")) return;

    try {
      await apiRequest(`/orders/${id}/cancel/`, "POST");
      alert("Order cancelled");
      loadOrder();
    } catch (err) {
      console.error(" Cancel error:", err);
      alert("Cancel failed");
    }
  };
  const startCamera = async () => {
    if (streamRef.current) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      console.error("Camera error:", err);
      alert("Camera permission denied");
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  useEffect(() => {
    if (showRefundModal) {
      setPreviewUrl(null);
      setPreviewType(null);
      setRefundFile(null);
      startCamera();
    } else {
      stopCamera();
    }

    return () => stopCamera();
  }, [showRefundModal]);
  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      if (!blob) return;

      const file = new File([blob], "refund.jpg", { type: "image/jpeg" });

      setRefundFile(file);
      setPreviewUrl(URL.createObjectURL(blob));
      setPreviewType("image");
    });
  };
  const startRecording = () => {
    if (!streamRef.current || isRecording) return;

    chunksRef.current = [];

    const recorder = new MediaRecorder(streamRef.current);
    recorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      const file = new File([blob], "refund.webm");

      setRefundFile(file);
      setPreviewUrl(URL.createObjectURL(blob));
      setPreviewType("video");
      setIsRecording(false);
    };

    recorder.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
  };
  const requestRefund = async () => {

    if (!refundReason) {
      alert("Select reason");
      return;
    }

    try {
      setSubmittingRefund(true);

      const formData = new FormData();
      formData.append("reason", refundReason);
      formData.append("description", refundDescription);

      if (refundFile) {
        formData.append("proof", refundFile);
      }

      await apiRequest(`/orders/${id}/refund/`, "POST", formData);

      alert("Refund submitted");
      setShowRefundModal(false);

    } catch (err) {
      console.error(" Refund error:", err);
      alert("Refund failed");
    } finally {
      setSubmittingRefund(false);
    }
  };
  if (loading) return <div className="p-10 text-center">Loading...</div>;
  if (error) return <div className="p-10 text-red-600">{error}</div>;
  if (!order) return <div className="p-10">Order not found</div>;
  return (
    <div className="min-h-screen bg-[#f3e5d8] py-10 px-6">

      <div className="max-w-5xl mx-auto space-y-6">
        <div className="p-6 bg-white shadow rounded-2xl">
          <h1 className="text-2xl font-bold">Order #{order.id}</h1>
          <p>{new Date(order.created_at).toLocaleString()}</p>

          <span className="px-3 py-1 bg-[#6d4c41] text-white rounded">
            {order.status}
          </span>
          {order.status === "PENDING" && (
            <button
              onClick={cancelOrder}
              className="px-5 py-2 mt-4 text-white bg-red-600 rounded"
            >
              Cancel Order
            </button>
          )}
        </div>
        {order.address && (
          <div className="p-6 bg-white shadow rounded-2xl">
            <h2 className="mb-2 font-bold">Address</h2>
            <p>{order.address.full_name}</p>
            <p>{order.address.address_line}</p>
            <p>{order.address.city}</p>
          </div>
        )}
        <div className="p-6 bg-white shadow rounded-2xl">
          <h2 className="mb-2 font-bold">Items</h2>
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between py-2">
              <span>{item.product_name}</span>
              <span>₹ {item.total_price}</span>
            </div>
          ))}
        </div>
        {(order.status === "COMPLETED" || order.status === "DELIVERED") && (
          <button
            onClick={() => setShowRefundModal(true)}
            className="px-5 py-3 text-white bg-orange-600 rounded-xl"
          >
            Request Refund
          </button>
        )}
        {showRefundModal && (
          <div className="fixed inset-0 flex items-center justify-center p-4 bg-black/50">

            <div className="w-full max-w-lg p-6 space-y-4 bg-white rounded-xl">

              <h2 className="text-lg font-bold">Request Refund</h2>

              <select
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="">Select reason</option>
                <option value="DAMAGED">Damaged</option>
                <option value="WRONG_ITEM">Wrong Item</option>
              </select>

              <textarea
                placeholder="Description"
                value={refundDescription}
                onChange={(e) => setRefundDescription(e.target.value)}
                className="w-full p-2 border rounded"
              />

              <video ref={videoRef} className="w-full h-48 bg-black" />

              <div className="flex gap-2">
                <button onClick={capturePhoto}>Photo</button>
                <button onClick={startRecording}>Record</button>
                <button onClick={stopRecording}>Stop</button>
              </div>

              {previewUrl && (
                previewType === "image"
                  ? <img src={previewUrl} className="w-full" />
                  : <video src={previewUrl} controls className="w-full" />
              )}

              <button
                onClick={requestRefund}
                disabled={submittingRefund}
                className={`w-full py-2 text-white rounded ${
                  submittingRefund ? "bg-gray-400" : "bg-green-600"
                }`}
              >
                {submittingRefund ? "Submitting..." : "Submit Refund"}
              </button>

              <button
                onClick={() => setShowRefundModal(false)}
                className="w-full py-2 text-white bg-gray-400 rounded"
              >
                Cancel
              </button>

            </div>

          </div>
        )}

      </div>

    </div>
  );
}