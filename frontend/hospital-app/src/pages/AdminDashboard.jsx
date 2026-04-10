import React, { useEffect, useState } from "react";
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  FormControl,
  FormLabel,
  Grid,
  Heading,
  HStack,
  Input,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
} from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import {
  cancelAppointmentByAdmin,
  deleteDepartmentClosure,
  fetchDepartmentAppointments,
  fetchDepartmentClosures,
  fetchManagedDepartments,
  saveDepartmentClosure,
  updateDepartmentStatus,
} from "../api/adminApi";
import { useAuth } from "../auth/AuthContext";
import { LoadingCard } from "../components/LoadingState";
import PageShell from "../components/PageShell";
import { formatDateTime, toDateInputValue } from "../utils/dateTime";

function AdminLoadingLayout() {
  return (
    <Grid templateColumns={{ base: "1fr", xl: "1fr 1fr" }} gap={6}>
      <LoadingCard minH="320px" titleWidth="38%" lines={5} />
      <LoadingCard minH="320px" titleWidth="38%" lines={5} />
      <LoadingCard minH="320px" titleWidth="38%" lines={5} />
      <LoadingCard minH="320px" titleWidth="38%" lines={5} />
    </Grid>
  );
}

export default function AdminDashboard() {
  const { token, logout } = useAuth();
  const navigate = useNavigate();
  const [departments, setDepartments] = useState([]);
  const [closures, setClosures] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  const [departmentSavingId, setDepartmentSavingId] = useState("");
  const [closureSaving, setClosureSaving] = useState(false);
  const [cancelingAppointmentId, setCancelingAppointmentId] = useState("");
  const [closureForm, setClosureForm] = useState({
    departmentId: "",
    date: toDateInputValue(new Date()),
    reason: "",
  });
  const [appointmentFilter, setAppointmentFilter] = useState({
    departmentId: "",
    date: toDateInputValue(new Date()),
  });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadAdminData = async () => {
    setPageLoading(true);
    setError("");

    try {
      const [departmentRes, closureRes] = await Promise.all([
        fetchManagedDepartments(token),
        fetchDepartmentClosures(token),
      ]);
      setDepartments(departmentRes.items);
      setClosures(closureRes.items);
    } catch (nextError) {
      setError(nextError.message || "管理情報の取得に失敗しました。");
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, [token]);

  useEffect(() => {
    if (departments.length === 0) {
      return;
    }

    setClosureForm((current) => ({
      ...current,
      departmentId: current.departmentId || departments[0].id,
    }));
    setAppointmentFilter((current) => ({
      ...current,
      departmentId: current.departmentId || departments[0].id,
    }));
  }, [departments]);

  useEffect(() => {
    if (!appointmentFilter.departmentId || !appointmentFilter.date) {
      return;
    }

    setAppointmentsLoading(true);
    setError("");

    fetchDepartmentAppointments({
      departmentId: appointmentFilter.departmentId,
      date: appointmentFilter.date,
      token,
    })
      .then((result) => setAppointments(result.items))
      .catch((nextError) => setError(nextError.message || "予約一覧の取得に失敗しました。"))
      .finally(() => setAppointmentsLoading(false));
  }, [appointmentFilter, token]);

  const handleToggleDepartment = async (department) => {
    setDepartmentSavingId(department.id);
    setError("");
    setMessage("");

    try {
      await updateDepartmentStatus({
        departmentId: department.id,
        isActive: !department.is_active,
        token,
      });
      setDepartments((current) =>
        current.map((item) =>
          item.id === department.id ? { ...item, is_active: !item.is_active } : item
        )
      );
      setClosures((current) =>
        current.map((closure) =>
          closure.department_id === department.id
            ? { ...closure, department_name: department.name }
            : closure
        )
      );
      setMessage(
        !department.is_active
          ? `${department.name} の受付を再開しました。`
          : `${department.name} の受付を停止しました。`
      );
    } catch (nextError) {
      setError(nextError.message || "診療科の更新に失敗しました。");
    } finally {
      setDepartmentSavingId("");
    }
  };

  const handleSaveClosure = async () => {
    if (!closureForm.departmentId || !closureForm.date) {
      setError("診療科と日付を選択してください。");
      return;
    }

    setClosureSaving(true);
    setError("");
    setMessage("");

    try {
      const saved = await saveDepartmentClosure({
        departmentId: closureForm.departmentId,
        date: closureForm.date,
        reason: closureForm.reason,
        token,
      });
      setClosures((current) => {
        const next = current.filter((item) => item.id !== saved.id);
        return [...next, saved].sort((left, right) => left.date.localeCompare(right.date));
      });
      setMessage("休診日を登録しました。新規予約は受け付けなくなります。");
      setClosureForm((current) => ({ ...current, reason: "" }));
    } catch (nextError) {
      setError(nextError.message || "休診日の登録に失敗しました。");
    } finally {
      setClosureSaving(false);
    }
  };

  const handleDeleteClosure = async (closure) => {
    setError("");
    setMessage("");

    try {
      await deleteDepartmentClosure({
        departmentId: closure.department_id,
        date: closure.date,
        token,
      });
      setClosures((current) => current.filter((item) => item.id !== closure.id));
      setMessage("休診日を解除しました。");
    } catch (nextError) {
      setError(nextError.message || "休診日の解除に失敗しました。");
    }
  };

  const handleCancelAppointment = async (appointment) => {
    const confirmed = window.confirm(
      `${appointment.patient_user_name} さんの予約をキャンセルします。通知は送信されません。`
    );
    if (!confirmed) {
      return;
    }

    setCancelingAppointmentId(appointment.id);
    setError("");
    setMessage("");

    try {
      await cancelAppointmentByAdmin({
        appointmentId: appointment.id,
        userId: appointment.user_id,
        token,
      });
      setAppointments((current) => current.filter((item) => item.id !== appointment.id));
      setMessage("予約をキャンセルしました。");
    } catch (nextError) {
      setError(nextError.message || "予約のキャンセルに失敗しました。");
    } finally {
      setCancelingAppointmentId("");
    }
  };

  return (
    <PageShell
      title="管理者画面"
      subtitle="診療科の受付状態、休診日、予約状況を管理します。"
      heroSubtitle="予約運用と休診日設定を行う管理者向け画面です。通知機能はまだ実装していません。"
      actions={
        <HStack spacing={3}>
          <Button variant="outline" onClick={() => navigate("/")}>
            患者画面へ
          </Button>
          <Button colorScheme="red" variant="outline" onClick={logout}>
            ログアウト
          </Button>
        </HStack>
      }
    >
      {error && (
        <Alert status="error" mb={4} borderRadius="md">
          <AlertIcon />
          <Text>{error}</Text>
        </Alert>
      )}

      {message && (
        <Alert status="success" mb={4} borderRadius="md">
          <AlertIcon />
          <Text>{message}</Text>
        </Alert>
      )}

      {pageLoading ? (
        <AdminLoadingLayout />
      ) : (
        <Grid templateColumns={{ base: "1fr", xl: "1fr 1fr" }} gap={6}>
          <Box bg="white" borderRadius="24px" p={{ base: 5, md: 7 }} boxShadow="sm">
            <Stack spacing={4}>
              <Heading size="md">診療科の受付状態</Heading>
              <Text color="surface.700">
                受付停止にすると、新しい予約を取れなくなります。既存予約は自動では消えません。
              </Text>
              <Stack spacing={3}>
                {departments.map((department) => (
                  <Box key={department.id} borderWidth="1px" borderColor="surface.200" borderRadius="20px" p={4}>
                    <Stack spacing={3}>
                      <HStack justify="space-between" align="center">
                        <Text fontSize="xl" fontWeight="800">
                          {department.name}
                        </Text>
                        <Badge colorScheme={department.is_active ? "teal" : "red"} px={3} py={1} borderRadius="full">
                          {department.is_active ? "受付中" : "停止中"}
                        </Badge>
                      </HStack>
                      <Button
                        colorScheme={department.is_active ? "red" : "teal"}
                        variant={department.is_active ? "outline" : "solid"}
                        isLoading={departmentSavingId === department.id}
                        onClick={() => handleToggleDepartment(department)}
                      >
                        {department.is_active ? "受付を停止する" : "受付を再開する"}
                      </Button>
                    </Stack>
                  </Box>
                ))}
              </Stack>
            </Stack>
          </Box>

          <Box bg="white" borderRadius="24px" p={{ base: 5, md: 7 }} boxShadow="sm">
            <Stack spacing={4}>
              <Heading size="md">休診日を登録する</Heading>
              <Text color="surface.700">
                指定した診療科と日付の新規予約を止めます。通知は送信されません。
              </Text>
              <FormControl>
                <FormLabel>診療科</FormLabel>
                <Select
                  value={closureForm.departmentId}
                  onChange={(event) =>
                    setClosureForm((current) => ({ ...current, departmentId: event.target.value }))
                  }
                >
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>日付</FormLabel>
                <Input
                  type="date"
                  value={closureForm.date}
                  onChange={(event) =>
                    setClosureForm((current) => ({ ...current, date: event.target.value }))
                  }
                />
              </FormControl>
              <FormControl>
                <FormLabel>理由</FormLabel>
                <Textarea
                  value={closureForm.reason}
                  onChange={(event) =>
                    setClosureForm((current) => ({ ...current, reason: event.target.value }))
                  }
                  placeholder="例: 学会参加のため、院内研修のため"
                  minH="120px"
                />
              </FormControl>
              <Button colorScheme="orange" onClick={handleSaveClosure} isLoading={closureSaving}>
                休診日を登録する
              </Button>
            </Stack>
          </Box>

          <Box bg="white" borderRadius="24px" p={{ base: 5, md: 7 }} boxShadow="sm">
            <Stack spacing={4}>
              <Heading size="md">登録済みの休診日</Heading>
              {closures.length === 0 ? (
                <Text color="surface.700">休診日はまだ登録されていません。</Text>
              ) : (
                <Stack spacing={3}>
                  {closures.map((closure) => (
                    <Box key={closure.id} borderWidth="1px" borderColor="surface.200" borderRadius="20px" p={4}>
                      <Stack spacing={2}>
                        <HStack justify="space-between" align="flex-start">
                          <Box>
                            <Text fontWeight="800">{closure.department_name}</Text>
                            <Text>{closure.date}</Text>
                          </Box>
                          <Button
                            size="sm"
                            variant="outline"
                            colorScheme="red"
                            onClick={() => handleDeleteClosure(closure)}
                          >
                            解除
                          </Button>
                        </HStack>
                        <Text color="surface.700">{closure.reason || "理由未入力"}</Text>
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              )}
            </Stack>
          </Box>

          <Box bg="white" borderRadius="24px" p={{ base: 5, md: 7 }} boxShadow="sm">
            <Stack spacing={4}>
              <Heading size="md">日付ごとの予約確認</Heading>
              <Text color="surface.700">
                既存予約の確認と代行キャンセルができます。キャンセルしても通知は送信されません。
              </Text>
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <FormControl>
                  <FormLabel>診療科</FormLabel>
                  <Select
                    value={appointmentFilter.departmentId}
                    onChange={(event) =>
                      setAppointmentFilter((current) => ({
                        ...current,
                        departmentId: event.target.value,
                      }))
                    }
                  >
                    {departments.map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.name}
                      </option>
                    ))}
                  </Select>
                </FormControl>
                <FormControl>
                  <FormLabel>日付</FormLabel>
                  <Input
                    type="date"
                    value={appointmentFilter.date}
                    onChange={(event) =>
                      setAppointmentFilter((current) => ({
                        ...current,
                        date: event.target.value,
                      }))
                    }
                  />
                </FormControl>
              </SimpleGrid>

              {appointmentsLoading ? (
                <LoadingCard minH="220px" titleWidth="24%" lines={4} />
              ) : appointments.length === 0 ? (
                <Text color="surface.700">この条件の予約はありません。</Text>
              ) : (
                <Stack spacing={3}>
                  {appointments.map((appointment) => (
                    <Box
                      key={appointment.id}
                      borderWidth="1px"
                      borderColor="surface.200"
                      borderRadius="20px"
                      p={4}
                    >
                      <Stack spacing={3}>
                        <HStack justify="space-between" align="flex-start">
                          <Box>
                            <Text fontSize="lg" fontWeight="800">
                              {appointment.patient_user_name}
                            </Text>
                            <Text color="surface.700">{formatDateTime(appointment.start_at)}</Text>
                          </Box>
                          <Button
                            size="sm"
                            colorScheme="red"
                            variant="outline"
                            isLoading={cancelingAppointmentId === appointment.id}
                            onClick={() => handleCancelAppointment(appointment)}
                          >
                            予約をキャンセル
                          </Button>
                        </HStack>
                        <Text>メール: {appointment.patient_email || "未登録"}</Text>
                        <Text>電話番号: {appointment.patient_phone || "未登録"}</Text>
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              )}
            </Stack>
          </Box>
        </Grid>
      )}
    </PageShell>
  );
}
