import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  AlertIcon,
  Button,
  Grid,
  GridItem,
  HStack,
  SkeletonText,
  SimpleGrid,
  Stack,
  Text,
} from "@chakra-ui/react";
import { fetchAppointments } from "../api/appointmentApi";
import { fetchDepartments } from "../api/departmentApi";
import { LoadingButtonGrid, LoadingCard } from "../components/LoadingState";
import { PatientInfoGrid, PatientInfoItem, PatientPanel } from "../components/PatientPanels";
import PageShell from "../components/PageShell";
import { useAuth } from "../auth/AuthContext";
import { formatDateTime } from "../utils/dateTime";

function HomeLoadingLayout() {
  return (
    <Stack spacing={6}>
      <Grid templateColumns={{ base: "1fr", lg: "1fr 1fr" }} gap={6}>
        <LoadingCard minH="230px" titleWidth="34%" lines={4} />
        <LoadingCard minH="230px" titleWidth="34%" lines={3} />
      </Grid>

      <LoadingCard minH="320px" titleWidth="42%" lines={2}>
        <Stack spacing={4}>
          <SkeletonText noOfLines={2} spacing="4" skeletonHeight="4" />
          <LoadingButtonGrid count={6} columns={{ base: 1, md: 2, xl: 3 }} height="88px" />
        </Stack>
      </LoadingCard>
    </Stack>
  );
}

export default function Home() {
  const { token, user, logout, isLoading } = useAuth();
  const [departments, setDepartments] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      return;
    }

    setLoading(true);
    setError("");

    Promise.all([
      fetchDepartments(token),
      fetchAppointments(token),
    ])
      .then(([departmentRes, appointmentRes]) => {
        setDepartments(departmentRes.items);
        setAppointments(appointmentRes.items);
      })
      .catch((e) => {
        setError(e.message || "画面の表示に必要な情報を取得できませんでした。");
      })
      .finally(() => setLoading(false));
  }, [token]);

  const nextAppointment = useMemo(() => appointments[0] || null, [appointments]);

  if (isLoading) {
    return (
      <PageShell title="読み込み中" subtitle="ログイン情報を確認しています。" showBack={false}>
        <HomeLoadingLayout />
      </PageShell>
    );
  }

  if (!token) {
    return (
      <PageShell
        title="ご利用案内"
        subtitle="診療科を選んで、見やすいカレンダーから予約できます。ログインと新規登録は分けて案内しています。"
        showBack={false}
      >
        <Grid templateColumns={{ base: "1fr", lg: "1.2fr 0.8fr" }} gap={6}>
          <GridItem>
            <PatientPanel
              badge={{ label: "外来予約", colorScheme: "teal" }}
              title="ご希望の診療科を選び、空いている日時から予約できます"
              description="文字を大きめにし、迷いにくい流れを優先しています。ご高齢の方でも操作しやすいよう、手順はできるだけ少なくしています。"
            >
              <Stack spacing={4}>
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3} pt={2}>
                  <Button colorScheme="teal" onClick={() => navigate("/login")}>
                    ログインする
                  </Button>
                  <Button variant="outline" onClick={() => navigate("/register")}>
                    はじめての方はこちら
                  </Button>
                </SimpleGrid>
              </Stack>
            </PatientPanel>
          </GridItem>

          <GridItem>
            <PatientPanel title="診療の流れ" description="予約完了までの流れを4つの手順にまとめています。">
              <Stack spacing={4}>
                <Text fontSize="lg">1. ログインまたは新規登録</Text>
                <Text fontSize="lg">2. 診療科を選択</Text>
                <Text fontSize="lg">3. 日付と時間を選択</Text>
                <Text fontSize="lg">4. 内容を確認して予約</Text>
              </Stack>
            </PatientPanel>
          </GridItem>
        </Grid>
      </PageShell>
    );
  }

  return (
    <PageShell
      title={`こんにちは、${user?.user_name || "患者さま"}さん`}
      subtitle="予約確認、変更、キャンセル、新しい予約がここから行えます。"
      showBack={false}
      actions={
        <HStack spacing={3}>
          {user?.is_admin && (
            <Button colorScheme="orange" onClick={() => navigate("/admin")}>
              管理者画面
            </Button>
          )}
          <Button variant="outline" onClick={() => navigate("/profile")}>
            プロフィール
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

      {loading ? (
        <HomeLoadingLayout />
      ) : (
        <Stack spacing={6}>
          <Grid templateColumns={{ base: "1fr", lg: "1fr 1fr" }} gap={6}>
            <GridItem>
              <PatientPanel title="次の予約" description="直近の受診予定を確認できます。">
                <Stack spacing={4}>
                  {nextAppointment ? (
                    <>
                      <PatientInfoGrid columns={{ base: 1, md: 2 }}>
                        <PatientInfoItem label="診療科" value={nextAppointment.department_name} />
                        <PatientInfoItem label="予約日時" value={formatDateTime(nextAppointment.start_at)} />
                      </PatientInfoGrid>
                      <Button
                        colorScheme="teal"
                        alignSelf="flex-start"
                        onClick={() => navigate(`/appointments/${nextAppointment.id}`)}
                      >
                        詳細を見る
                      </Button>
                    </>
                  ) : (
                    <Text fontSize="lg">現在、予約は入っていません。</Text>
                  )}
                </Stack>
              </PatientPanel>
            </GridItem>

            <GridItem>
              <PatientPanel title="予約メニュー" description="予約の確認、プロフィール確認、管理者画面への移動ができます。">
                <Stack spacing={4}>
                  <Button colorScheme="teal" onClick={() => navigate("/appointments")}>
                    予約一覧を見る
                  </Button>
                  {user?.is_admin && (
                    <Button colorScheme="orange" variant="outline" onClick={() => navigate("/admin")}>
                      管理者画面を開く
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => navigate("/profile")}>
                    プロフィールを確認する
                  </Button>
                </Stack>
              </PatientPanel>
            </GridItem>
          </Grid>

          <PatientPanel
            title="診療科を選んで予約する"
            description="空いている日時をカレンダーから確認し、予約できます。"
          >
            <Stack spacing={4}>
              <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing={4}>
                {departments.map((department) => (
                  <Button
                    key={department.id}
                    h="88px"
                    justifyContent="space-between"
                    colorScheme="teal"
                    variant="outline"
                    onClick={() =>
                      navigate(`/book/${department.id}`, {
                        state: { departmentName: department.name },
                      })
                    }
                  >
                    <Text fontSize="xl" fontWeight="800">
                      {department.name}
                    </Text>
                    <Text fontSize="sm">予約へ進む</Text>
                  </Button>
                  ))}
              </SimpleGrid>
            </Stack>
          </PatientPanel>
        </Stack>
      )}
    </PageShell>
  );
}
